import type { WidgetConfig } from "@/components/ResponsiveLayout";
import WatchlistWidget from "@/components/WatchlistWidget";
import MarketDataWidget from "@/components/MarketDataWidget";
import OrderBookWidget from "@/components/OrderBookWidget";
import WebhookWidget from "@/components/WebhookWidget";
import AlertsWidget, { type Alert as AlertWidgetType } from "@/components/AlertsWidget";
import MomentumWidget from "@/components/MomentumWidget";
import TrendWidget from "@/components/TrendWidget";
import VolatilityWidget from "@/components/VolatilityWidget";
import CorrelationMatrixWidget from "@/components/CorrelationMatrixWidget";
import MarketSentimentWidget from "@/components/MarketSentimentWidget";
import FibonacciRetracementWidget from "@/components/FibonacciRetracementWidget";
import StochasticOscillatorWidget from "@/components/StochasticOscillatorWidget";
import FundingRateWidget from "@/components/FundingRateWidget";
import type { Alert, WebhookMessage } from "@shared/schema";

interface WidgetFactoryParams {
  // Real-time data
  marketData: Map<string, Map<string, any>>;
  orderBooks: Map<string, Map<string, any>>;
  selectedExchanges: string[];
  
  // Widget configurations
  onMarketConfigure: () => void;
  orderBookViewMode: "both" | "bids" | "asks";
  onOrderBookConfigure: () => void;
  
  // Webhook widget
  webhookMessages: WebhookMessage[];
  onToggleBookmark: (id: string) => void;
  
  // Alerts widget
  onAddAlert: () => void;
  onEditAlert: (alert: AlertWidgetType) => void;
  
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
          marketData={params.marketData}
          selectedExchanges={params.selectedExchanges}
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
          marketData={params.marketData}
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
          orderBooks={params.orderBooks}
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
          onAddAlert={params.onAddAlert}
          onEditAlert={params.onEditAlert}
        />
      )
    },
    {
      id: "momentum-1",
      title: "Momentum Indicators",
      category: "trading",
      priority: "medium",
      defaultSize: { w: 4, h: 6, minW: 3, minH: 4 },
      component: (
        <MomentumWidget exchanges={params.technicalIndicatorExchanges} />
      )
    },
    {
      id: "trend-1",
      title: "Trend Indicators",
      category: "trading",
      priority: "medium",
      defaultSize: { w: 4, h: 6, minW: 3, minH: 4 },
      component: (
        <TrendWidget exchanges={params.technicalIndicatorExchanges} />
      )
    },
    {
      id: "volatility-1",
      title: "Volatility Indicators",
      category: "trading",
      priority: "medium",
      defaultSize: { w: 4, h: 5, minW: 3, minH: 3 },
      component: (
        <VolatilityWidget exchanges={params.technicalIndicatorExchanges} />
      )
    },
    {
      id: "correlation-matrix-1",
      title: "Correlation Matrix",
      category: "analytics",
      priority: "medium",
      defaultSize: { w: 6, h: 6, minW: 4, minH: 4 },
      component: (
        <CorrelationMatrixWidget
          exchanges={params.technicalIndicatorExchanges}
        />
      )
    },
    {
      id: "market-sentiment-1",
      title: "Market Sentiment",
      category: "analytics",
      priority: "medium",
      defaultSize: { w: 3, h: 5, minW: 3, minH: 4 },
      component: <MarketSentimentWidget />
    },
    {
      id: "fibonacci-retracement-1",
      title: "Fibonacci Retracement",
      category: "analytics",
      priority: "medium",
      defaultSize: { w: 4, h: 8, minW: 3, minH: 6 },
      component: (
        <FibonacciRetracementWidget
          exchanges={params.technicalIndicatorExchanges}
        />
      )
    },
    {
      id: "stochastic-oscillator-1",
      title: "Stochastic Oscillator",
      category: "analytics",
      priority: "medium",
      defaultSize: { w: 4, h: 6, minW: 3, minH: 4 },
      component: (
        <StochasticOscillatorWidget
          exchanges={params.technicalIndicatorExchanges}
        />
      )
    },
    {
      id: "funding-rate-1",
      title: "Funding Rates",
      category: "trading",
      priority: "high",
      defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
      component: (
        <FundingRateWidget />
      )
    }
  ];
}
