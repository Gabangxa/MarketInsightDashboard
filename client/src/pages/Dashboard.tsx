import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid } from "lucide-react";
import MarketDataWidget from "@/components/MarketDataWidget";
import OrderBookWidget from "@/components/OrderBookWidget";
import WebhookWidget from "@/components/WebhookWidget";
import AlertsWidget, { type Alert as AlertWidgetType } from "@/components/AlertsWidget";
import AlertConfigPanel from "@/components/AlertConfigPanel";
import WatchlistWidget from "@/components/WatchlistWidget";
import OrderBookConfigModal from "@/components/OrderBookConfigModal";
import MarketDataConfigModal from "@/components/MarketDataConfigModal";
import { Toaster } from "react-hot-toast";
import { useMarketWebSocket } from "@/lib/useMarketWebSocket";
import { aggregateMarketData, aggregateOrderBook } from "@/lib/marketAggregation";
import { useAlertMonitor } from "@/lib/useAlertMonitor";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WatchlistToken, Alert, WebhookMessage } from "@shared/schema";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function Dashboard() {
  const [isAlertPanelOpen, setIsAlertPanelOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertWidgetType | null>(null);
  const [isMarketConfigOpen, setIsMarketConfigOpen] = useState(false);
  const [isOrderBookConfigOpen, setIsOrderBookConfigOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [orderBookViewMode, setOrderBookViewMode] = useState<"both" | "bids" | "asks">("both");
  // Note: Binance is currently geo-blocked, using Bybit only
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>(["Bybit"]);

  // WebSocket connection
  const { marketData, orderBooks, newWebhook, isConnected, subscribe, unsubscribe } = useMarketWebSocket();

  // Fetch watchlist
  const { data: watchlistTokens = [] } = useQuery<WatchlistToken[]>({
    queryKey: ["/api/watchlist"],
  });

  // Fetch alerts
  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  // Fetch webhooks
  const { data: webhookMessages = [] } = useQuery<WebhookMessage[]>({
    queryKey: ["/api/webhooks"],
  });

  // Alert monitor
  useAlertMonitor({
    alerts,
    marketData,
    newWebhook,
  });

  // Watchlist mutations
  const addWatchlistMutation = useMutation({
    mutationFn: async (symbol: string) => {
      const res = await apiRequest("POST", "/api/watchlist", {
        symbol,
        exchanges: selectedExchanges,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
    },
  });

  const removeWatchlistMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/watchlist/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
    },
  });

  // Alert mutations
  const addAlertMutation = useMutation({
    mutationFn: async (config: any) => {
      const res = await apiRequest("POST", "/api/alerts", config);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      setIsAlertPanelOpen(false);
      setEditingAlert(null);
    },
  });

  const updateAlertMutation = useMutation({
    mutationFn: async (config: any) => {
      const { id, ...data } = config;
      const res = await apiRequest("PATCH", `/api/alerts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      setIsAlertPanelOpen(false);
      setEditingAlert(null);
    },
  });

  const deleteAlertMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/alerts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  // Webhook mutations
  const toggleBookmarkMutation = useMutation({
    mutationFn: async ({ id, bookmarked }: { id: string; bookmarked: boolean }) => {
      const res = await apiRequest("PATCH", `/api/webhooks/${id}`, { bookmarked: !bookmarked });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
    },
  });

  // Handle new webhooks from WebSocket
  useEffect(() => {
    if (newWebhook) {
      queryClient.setQueryData(["/api/webhooks"], (old: any = []) => {
        // Check if webhook already exists to prevent duplicates
        if (old.some((w: any) => w.id === newWebhook.id)) return old;
        // Add new webhook at the beginning (newest first)
        return [newWebhook, ...old];
      });
    }
  }, [newWebhook]);

  // Subscribe to symbols on watchlist
  useEffect(() => {
    watchlistTokens.forEach((token) => {
      subscribe(token.symbol, token.exchanges as string[]);
    });

    return () => {
      watchlistTokens.forEach((token) => {
        unsubscribe(token.symbol);
      });
    };
  }, [watchlistTokens, subscribe, unsubscribe]);

  // Subscribe to selected symbol
  useEffect(() => {
    subscribe(selectedSymbol, selectedExchanges);
    return () => {
      unsubscribe(selectedSymbol);
    };
  }, [selectedSymbol, selectedExchanges, subscribe, unsubscribe]);

  // Aggregate market data for selected symbol
  const aggregatedMarketData = useMemo(() => {
    const symbolData = marketData.get(selectedSymbol);
    if (!symbolData) return null;
    return aggregateMarketData(selectedSymbol, symbolData);
  }, [selectedSymbol, marketData]);

  // Aggregate order book for selected symbol
  const aggregatedOrderBook = useMemo(() => {
    const symbolOrderBooks = orderBooks.get(selectedSymbol);
    if (!symbolOrderBooks) return null;
    return aggregateOrderBook(selectedSymbol, symbolOrderBooks);
  }, [selectedSymbol, orderBooks]);

  // Calculate watchlist display data
  const watchlistData = useMemo(() => {
    return watchlistTokens.map((token) => {
      const symbolData = marketData.get(token.symbol);
      if (!symbolData) {
        return {
          symbol: token.symbol,
          price: 0,
          change24h: 0,
          volume24h: 0,
          change7d: 0,
        };
      }

      const aggregated = aggregateMarketData(token.symbol, symbolData);
      if (!aggregated) {
        return {
          symbol: token.symbol,
          price: 0,
          change24h: 0,
          volume24h: 0,
          change7d: 0,
        };
      }

      return {
        symbol: token.symbol,
        price: aggregated.price,
        change24h: aggregated.priceChangePercent,
        volume24h: aggregated.volume24hUSDT,
        change7d: aggregated.priceChangePercent * 1.2, // Mock 7d change
      };
    });
  }, [watchlistTokens, marketData]);

  // Optimized "best fit" layout for trading dashboard
  // Large screens: 3-column layout (Watchlist | Market+OrderBook | Webhooks+Alerts)
  // Medium screens: 2-column layout with stacking
  // Small screens: Single column, full width widgets
  const [layouts] = useState({
    lg: [
      // Watchlist: Left sidebar, full height
      { i: "watchlist-1", x: 0, y: 0, w: 3, h: 8, minW: 3, minH: 4 },
      // Market Data: Top center, compact
      { i: "market-1", x: 3, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
      // Order Book: Below market data, taller for full bid/ask display
      { i: "orderbook-1", x: 3, y: 3, w: 4, h: 5, minW: 3, minH: 4 },
      // Webhook Messages: Right column, tall
      { i: "webhook-1", x: 7, y: 0, w: 5, h: 5, minW: 3, minH: 4 },
      // Alerts: Bottom right, compact
      { i: "alerts-1", x: 7, y: 5, w: 5, h: 3, minW: 4, minH: 2 },
    ],
    md: [
      // Medium screens: 2-column layout
      { i: "watchlist-1", x: 0, y: 0, w: 5, h: 6, minW: 3, minH: 4 },
      { i: "market-1", x: 5, y: 0, w: 5, h: 3, minW: 3, minH: 2 },
      { i: "orderbook-1", x: 5, y: 3, w: 5, h: 5, minW: 3, minH: 4 },
      { i: "webhook-1", x: 0, y: 6, w: 5, h: 5, minW: 3, minH: 4 },
      { i: "alerts-1", x: 5, y: 8, w: 5, h: 3, minW: 4, minH: 2 },
    ],
    sm: [
      // Small screens: Single column, prioritize trading widgets
      { i: "market-1", x: 0, y: 0, w: 6, h: 3, minW: 3, minH: 2 },
      { i: "orderbook-1", x: 0, y: 3, w: 6, h: 5, minW: 3, minH: 4 },
      { i: "watchlist-1", x: 0, y: 8, w: 6, h: 6, minW: 3, minH: 4 },
      { i: "alerts-1", x: 0, y: 14, w: 6, h: 3, minW: 4, minH: 2 },
      { i: "webhook-1", x: 0, y: 17, w: 6, h: 5, minW: 3, minH: 4 },
    ],
  });

  const handleSelectToken = (symbol: string) => {
    setSelectedSymbol(symbol);
    // Update selected exchanges to match the token's configured exchanges
    const token = watchlistTokens.find(t => t.symbol === symbol);
    if (token && token.exchanges) {
      setSelectedExchanges(token.exchanges as string[]);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6" data-testid="page-dashboard">
      <Toaster position="top-right" />
      
      <div className="max-w-[1920px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <LayoutGrid className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Market Dashboard</h1>
            {!isConnected && (
              <span className="text-xs text-destructive">Connecting...</span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => console.log('Add widget')}
            data-testid="button-add-widget"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Widget
          </Button>
        </div>

        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={80}
          isDraggable={true}
          isResizable={true}
          resizeHandles={['se', 'sw', 'ne', 'nw', 's', 'n', 'e', 'w']}
        >
          <div key="watchlist-1" className="h-full">
            <WatchlistWidget
              tokens={watchlistData}
              selectedSymbol={selectedSymbol}
              onAddToken={(symbol) => addWatchlistMutation.mutate(symbol)}
              onRemoveToken={(symbol) => {
                const token = watchlistTokens.find(t => t.symbol === symbol);
                if (token) removeWatchlistMutation.mutate(token.id);
              }}
              onSelectToken={handleSelectToken}
            />
          </div>
          <div key="market-1" className="h-full">
            <MarketDataWidget
              data={aggregatedMarketData || {
                symbol: selectedSymbol,
                price: 0,
                priceChange: 0,
                priceChangePercent: 0,
                volume24hUSDT: 0,
                allTimeHigh: 0,
                allTimeLow: 0,
                exchanges: [],
              }}
              onConfigure={() => {
                console.log("Opening market config modal");
                setIsMarketConfigOpen(true);
              }}
            />
          </div>
          <div key="orderbook-1" className="h-full">
            <OrderBookWidget
              data={aggregatedOrderBook || {
                symbol: selectedSymbol,
                bids: [],
                asks: [],
                spread: 0,
                spreadPercent: 0,
                exchanges: [],
              }}
              viewMode={orderBookViewMode}
              onConfigure={() => {
                console.log("Opening order book config modal");
                setIsOrderBookConfigOpen(true);
              }}
            />
          </div>
          <div key="webhook-1" className="h-full">
            <WebhookWidget
              messages={webhookMessages.map(wh => ({
                ...wh,
                timestamp: new Date(wh.timestamp),
              }))}
              onToggleBookmark={(id) => {
                const msg = webhookMessages.find(m => m.id === id);
                if (msg) {
                  toggleBookmarkMutation.mutate({ id, bookmarked: msg.bookmarked });
                }
              }}
            />
          </div>
          <div key="alerts-1" className="h-full">
            <AlertsWidget
              alerts={alerts.map(a => ({
                id: a.id,
                type: a.type as "price" | "keyword",
                exchanges: a.exchanges as string[],
                condition: a.condition || undefined,
                value: a.value ? parseFloat(a.value) : undefined,
                keyword: a.keyword || undefined,
                triggered: a.triggered,
                lastTriggered: a.lastTriggered ? new Date(a.lastTriggered) : undefined,
                triggerCount: a.triggerCount,
                maxTriggers: a.maxTriggers,
              }))}
              onAddAlert={() => {
                setEditingAlert(null);
                setIsAlertPanelOpen(true);
              }}
              onEditAlert={(alert) => {
                setEditingAlert(alert);
                setIsAlertPanelOpen(true);
              }}
              onDeleteAlert={(id) => deleteAlertMutation.mutate(id)}
            />
          </div>
        </ResponsiveGridLayout>
      </div>

      <AlertConfigPanel
        isOpen={isAlertPanelOpen}
        onClose={() => {
          setIsAlertPanelOpen(false);
          setEditingAlert(null);
        }}
        editingAlert={editingAlert ? {
          id: editingAlert.id,
          type: editingAlert.type as "price" | "keyword",
          exchanges: editingAlert.exchanges,
          symbol: editingAlert.type === "price" ? (alerts.find(a => a.id === editingAlert.id)?.symbol || "") : undefined,
          condition: editingAlert.condition || undefined,
          value: editingAlert.value?.toString() || undefined,
          keyword: editingAlert.keyword || undefined,
          maxTriggers: editingAlert.maxTriggers || null,
        } : null}
        onSave={(config) => {
          // Ensure value is string for backend decimal type
          const alertData = {
            ...config,
            ...(config.value !== undefined && { value: String(config.value) })
          };
          
          if (config.id) {
            // Update existing alert
            updateAlertMutation.mutate(alertData);
          } else {
            // Create new alert
            addAlertMutation.mutate(alertData);
          }
        }}
      />

      <MarketDataConfigModal
        isOpen={isMarketConfigOpen}
        onClose={() => setIsMarketConfigOpen(false)}
        selectedExchanges={selectedExchanges}
        onExchangesChange={setSelectedExchanges}
      />

      <OrderBookConfigModal
        isOpen={isOrderBookConfigOpen}
        onClose={() => setIsOrderBookConfigOpen(false)}
        viewMode={orderBookViewMode}
        onViewModeChange={setOrderBookViewMode}
        selectedExchanges={selectedExchanges}
        onExchangesChange={setSelectedExchanges}
      />
    </div>
  );
}
