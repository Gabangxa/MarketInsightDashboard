import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload, RotateCcw } from "lucide-react";
import TabManager from "@/components/TabManager";
import ResponsiveLayout, { type WidgetConfig } from "@/components/ResponsiveLayout";
import MarketDataWidget from "@/components/MarketDataWidget";
import OrderBookWidget from "@/components/OrderBookWidget";
import WebhookWidget from "@/components/WebhookWidget";
import AlertsWidget, { type Alert as AlertWidgetType } from "@/components/AlertsWidget";
import AlertConfigPanel from "@/components/AlertConfigPanel";
import WatchlistWidget from "@/components/WatchlistWidget";
import OrderBookConfigModal from "@/components/OrderBookConfigModal";
import MarketDataConfigModal from "@/components/MarketDataConfigModal";
import TechnicalIndicatorsWidget from "@/components/TechnicalIndicatorsWidget";
import { Toaster } from "react-hot-toast";
import { useMarketWebSocket } from "@/lib/useMarketWebSocket";
import { aggregateMarketData, aggregateOrderBook } from "@/lib/marketAggregation";
import { useAlertMonitor } from "@/lib/useAlertMonitor";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTabSystem } from "@/hooks/useTabSystem";
import { useToast } from "@/hooks/use-toast";
import type { WatchlistToken, Alert, WebhookMessage } from "@shared/schema";

export default function Dashboard() {
  const [isAlertPanelOpen, setIsAlertPanelOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertWidgetType | null>(null);
  const [isMarketConfigOpen, setIsMarketConfigOpen] = useState(false);
  const [isOrderBookConfigOpen, setIsOrderBookConfigOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [orderBookViewMode, setOrderBookViewMode] = useState<"both" | "bids" | "asks">("both");
  // Note: Binance is currently geo-blocked, using Bybit only
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>(["Bybit"]);

  const { toast } = useToast();

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

  // Handler for selecting a token from watchlist
  const handleSelectToken = (symbol: string) => {
    setSelectedSymbol(symbol);
    // Update selected exchanges to match the token's configured exchanges
    const token = watchlistTokens.find(t => t.symbol === symbol);
    if (token && token.exchanges) {
      setSelectedExchanges(token.exchanges as string[]);
    }
  };

  // Define all available widgets for the tab system
  const availableWidgets: WidgetConfig[] = useMemo(() => [
    {
      id: "watchlist-1",
      title: "Watchlist",
      category: "data",
      priority: "high",
      defaultSize: { w: 3, h: 8, minW: 3, minH: 4 },
      component: (
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
      )
    },
    {
      id: "market-1", 
      title: "Market Data",
      category: "trading",
      priority: "high",
      defaultSize: { w: 4, h: 3, minW: 3, minH: 2 },
      component: (
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
      )
    },
    {
      id: "orderbook-1",
      title: "Order Book", 
      category: "trading",
      priority: "high",
      defaultSize: { w: 4, h: 5, minW: 3, minH: 4 },
      component: (
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
      )
    },
    {
      id: "webhook-1",
      title: "Webhook Messages",
      category: "alerts", 
      priority: "medium",
      defaultSize: { w: 5, h: 5, minW: 3, minH: 4 },
      component: (
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
      )
    },
    {
      id: "alerts-1",
      title: "Alerts",
      category: "alerts",
      priority: "medium", 
      defaultSize: { w: 5, h: 3, minW: 4, minH: 2 },
      component: (
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
      )
    },
    {
      id: "technical-indicators-1",
      title: "Technical Indicators",
      category: "trading",
      priority: "medium",
      defaultSize: { w: 4, h: 6, minW: 3, minH: 4 },
      component: (
        <TechnicalIndicatorsWidget
          marketData={(() => {
            // Convert market data to historical format for indicators
            const symbolData = marketData.get(selectedSymbol);
            if (!symbolData || symbolData.size === 0) return [];

            // Get historical price points from market data
            const historicalData: any[] = [];
            symbolData.forEach((exchangeData, exchange) => {
              if (exchangeData && typeof exchangeData === 'object' && 'price' in exchangeData) {
                historicalData.push({
                  timestamp: Date.now(),
                  price: exchangeData.price,
                  volume: exchangeData.volume24h || 0,
                  exchange: exchange
                });
              }
            });

            // Generate synthetic historical data for indicators (if needed for demo)
            if (historicalData.length > 0) {
              const basePrice = historicalData[0].price;
              const syntheticData = [];
              for (let i = 0; i < 50; i++) {
                const timeAgo = Date.now() - (i * 60000); // 1 minute intervals
                const priceVariation = 1 + (Math.random() - 0.5) * 0.02; // ±1% variation
                syntheticData.unshift({
                  timestamp: timeAgo,
                  price: basePrice * priceVariation,
                  volume: Math.random() * 1000000,
                });
              }
              return syntheticData;
            }

            return [];
          })()}
          symbol={selectedSymbol}
        />
      )
    }
  ], [
    watchlistData, selectedSymbol, addWatchlistMutation, watchlistTokens, 
    removeWatchlistMutation, aggregatedMarketData, aggregatedOrderBook,
    orderBookViewMode, webhookMessages, toggleBookmarkMutation, alerts,
    setEditingAlert, setIsAlertPanelOpen, deleteAlertMutation, handleSelectToken
  ]);

  // Initialize tab system
  const {
    tabs,
    activeTabId,
    activeTab,
    activeTabWidgets,
    createTab,
    updateTab,
    deleteTab,
    switchTab,
    reorderTabs,
    saveLayout,
    exportTabs,
    importTabs,
    resetTabs
  } = useTabSystem(availableWidgets);

  return (
    <div className="h-full bg-background overflow-hidden" data-testid="page-dashboard">
      <Toaster position="top-right" />

      {/* Tab Management System */}
      <TabManager
        tabs={tabs}
        activeTabId={activeTabId}
        availableWidgets={availableWidgets}
        onTabChange={switchTab}
        onTabCreate={createTab}
        onTabUpdate={updateTab}
        onTabDelete={deleteTab}
        onTabReorder={reorderTabs}
      />

      <div className="h-full flex flex-col overflow-hidden p-4 md:p-6">
        {/* Dashboard Actions */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {activeTab?.name || 'Dashboard'}
            </h2>
            {activeTab?.description && (
              <span className="text-sm text-muted-foreground">
                {activeTab.description}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportTabs}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>

            <input
              type="file"
              accept=".json"
              className="hidden"
              id="import-tabs"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  importTabs(file).then(() => {
                    toast({
                      title: "Success",
                      description: "Tabs imported successfully"
                    });
                  }).catch((error) => {
                    toast({
                      title: "Error", 
                      description: "Failed to import tabs: " + error.message,
                      variant: "destructive"
                    });
                  });
                }
                e.target.value = '';
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('import-tabs')?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetTabs();
                toast({
                  title: "Reset Complete",
                  description: "Dashboard reset to default configuration"
                });
              }}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        {/* Tab-Based Responsive Layout */}
        <div className="flex-1 overflow-hidden">
          <ResponsiveLayout
            widgets={activeTabWidgets}
            onLayoutChange={(layouts) => {
              saveLayout({ [activeTabId]: layouts });
            }}
            onSaveLayout={() => {
              toast({
                title: "Layout Saved",
                description: `Layout saved for "${activeTab?.name}"`
              });
            }}
          />
        </div>
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