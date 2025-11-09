import type { WidgetConfig } from "@/components/ResponsiveLayout";
import WatchlistWidget from "@/components/WatchlistWidget";
import MarketDataWidget from "@/components/MarketDataWidget";
import OrderBookWidget, { type OrderBookEntry } from "@/components/OrderBookWidget";
import WebhookWidget from "@/components/WebhookWidget";
import AlertsWidget, { type Alert as AlertWidgetType } from "@/components/AlertsWidget";
import TechnicalIndicatorsWidget from "@/components/TechnicalIndicatorsWidget";
import type { AggregatedOrderBook } from "@/lib/marketAggregation";
import type { Alert, WebhookMessage } from "@shared/schema";

interface WidgetFactoryParams {
  // Watchlist widget
  watchlistData: Array<{
    symbol: string;
    price: number;
    change24h: number;
    volume24h: number;
    change7d: number;
  }>;
  selectedSymbol: string;
  onAddToken: (symbol: string) => void;
  onRemoveToken: (symbol: string) => void;
  onSelectToken: (symbol: string) => void;
  
  // Market data widget
  aggregatedMarketData: {
    symbol: string;
    price: number;
    priceChange: number;
    priceChangePercent: number;
    volume24hUSDT: number;
    allTimeHigh: number;
    allTimeLow: number;
    exchanges: string[];
  } | null;
  onMarketConfigure: () => void;
  
  // Order book widget
  aggregatedOrderBook: AggregatedOrderBook | null;
  orderBookViewMode: "both" | "bids" | "asks";
  onOrderBookConfigure: () => void;
  
  // Webhook widget
  webhookMessages: WebhookMessage[];
  onToggleBookmark: (id: string) => void;
  
  // Alerts widget
  alerts: Alert[];
  onAddAlert: () => void;
  onEditAlert: (alert: AlertWidgetType) => void;
  onDeleteAlert: (id: string) => void;
  
  // Technical indicators widget
  technicalIndicatorExchanges: string[];
}

export function createAvailableWidgets(params: WidgetFactoryParams): WidgetConfig[] {
  return [
    {
      id: "watchlist-1",
      title: "Watchlist",
      category: "data",
      priority: "high",
      defaultSize: { w: 3, h: 8, minW: 3, minH: 4 },
      component: (
        <WatchlistWidget
          tokens={params.watchlistData}
          selectedSymbol={params.selectedSymbol}
          onAddToken={params.onAddToken}
          onRemoveToken={params.onRemoveToken}
          onSelectToken={params.onSelectToken}
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
          data={params.aggregatedMarketData || {
            symbol: params.selectedSymbol,
            price: 0,
            priceChange: 0,
            priceChangePercent: 0,
            volume24hUSDT: 0,
            allTimeHigh: 0,
            allTimeLow: 0,
            exchanges: [],
          }}
          onConfigure={params.onMarketConfigure}
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
          data={params.aggregatedOrderBook || {
            symbol: params.selectedSymbol,
            bids: [] as OrderBookEntry[],
            asks: [] as OrderBookEntry[],
            spread: 0,
            spreadPercent: 0,
            exchanges: [],
          }}
          viewMode={params.orderBookViewMode}
          onConfigure={params.onOrderBookConfigure}
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
          messages={params.webhookMessages.map(wh => ({
            ...wh,
            timestamp: new Date(wh.timestamp),
          }))}
          onToggleBookmark={params.onToggleBookmark}
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
          alerts={params.alerts.map(a => ({
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
          onAddAlert={params.onAddAlert}
          onEditAlert={params.onEditAlert}
          onDeleteAlert={params.onDeleteAlert}
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
          symbol={params.selectedSymbol}
          exchanges={params.technicalIndicatorExchanges}
        />
      )
    }
  ];
}
