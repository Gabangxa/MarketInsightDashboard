import { useState } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid } from "lucide-react";
import MarketDataWidget from "@/components/MarketDataWidget";
import OrderBookWidget from "@/components/OrderBookWidget";
import WebhookWidget from "@/components/WebhookWidget";
import AlertsWidget from "@/components/AlertsWidget";
import AlertConfigPanel from "@/components/AlertConfigPanel";
import { Toaster } from "react-hot-toast";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

//todo: remove mock functionality - mock data for prototype
const mockMarketData = {
  symbol: "BTCUSDT",
  price: 67234.56,
  priceChange: 1234.56,
  priceChangePercent: 1.87,
  volume24hUSDT: 42500000000,
  allTimeHigh: 73750.07,
  allTimeLow: 15760.00,
  exchanges: ["Binance", "Bybit"]
};

//todo: remove mock functionality - mock data for prototype
const mockOrderBook = {
  symbol: "BTCUSDT",
  bids: [
    { price: 67230.00, size: 0.5234, total: 35186.12 },
    { price: 67229.50, size: 1.2341, total: 82965.83 },
    { price: 67229.00, size: 0.8765, total: 58921.47 },
    { price: 67228.50, size: 2.1234, total: 142743.22 },
    { price: 67228.00, size: 0.4567, total: 30695.52 },
  ],
  asks: [
    { price: 67235.00, size: 0.6543, total: 43995.71 },
    { price: 67235.50, size: 1.4321, total: 96290.37 },
    { price: 67236.00, size: 0.9876, total: 66398.13 },
    { price: 67236.50, size: 2.3456, total: 157715.79 },
    { price: 67237.00, size: 0.5678, total: 38172.27 },
  ],
  spread: 5.00,
  spreadPercent: 0.007,
  exchanges: ["Binance", "Bybit", "OKX"]
};

//todo: remove mock functionality - mock data for prototype
const mockWebhookMessages = [
  {
    id: "1",
    source: "TradingView",
    message: "BTC breakout signal detected at $67,500 resistance level",
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    bookmarked: true
  },
  {
    id: "2",
    source: "PriceAlert",
    message: "ETH price crossed $3,200 threshold - alert triggered",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    bookmarked: false
  },
  {
    id: "3",
    source: "VolumeMonitor",
    message: "Unusual volume spike detected on BTCUSDT - 200% above average",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    bookmarked: false
  }
];

//todo: remove mock functionality - mock data for prototype
const mockAlerts = [
  {
    id: "1",
    type: "price" as const,
    exchanges: ["Binance", "Bybit"],
    condition: ">",
    value: 68000,
    triggered: false
  },
  {
    id: "2",
    type: "keyword" as const,
    exchanges: ["Binance"],
    keyword: "breakout",
    triggered: true,
    lastTriggered: new Date(Date.now() - 5 * 60 * 1000)
  }
];

export default function Dashboard() {
  const [isAlertPanelOpen, setIsAlertPanelOpen] = useState(false);
  const [webhookMessages, setWebhookMessages] = useState(mockWebhookMessages);
  const [alerts, setAlerts] = useState(mockAlerts);

  const [layouts] = useState<{ lg: Layout[] }>({
    lg: [
      { i: "market-1", x: 0, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
      { i: "orderbook-1", x: 4, y: 0, w: 4, h: 3, minW: 3, minH: 3 },
      { i: "webhook-1", x: 8, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
      { i: "alerts-1", x: 0, y: 3, w: 8, h: 3, minW: 4, minH: 2 },
    ]
  });

  const handleToggleBookmark = (id: string) => {
    setWebhookMessages(prev => prev.map(msg =>
      msg.id === id ? { ...msg, bookmarked: !msg.bookmarked } : msg
    ));
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6" data-testid="page-dashboard">
      <Toaster position="top-right" />
      
      <div className="max-w-[1920px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <LayoutGrid className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Market Dashboard</h1>
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
          draggableHandle=".drag-handle"
        >
          <div key="market-1" className="drag-handle cursor-move">
            <MarketDataWidget
              data={mockMarketData}
              onConfigure={() => console.log('Configure market widget')}
            />
          </div>
          <div key="orderbook-1" className="drag-handle cursor-move">
            <OrderBookWidget
              data={mockOrderBook}
              onConfigure={() => console.log('Configure orderbook widget')}
            />
          </div>
          <div key="webhook-1" className="drag-handle cursor-move">
            <WebhookWidget
              messages={webhookMessages}
              onToggleBookmark={handleToggleBookmark}
            />
          </div>
          <div key="alerts-1" className="drag-handle cursor-move">
            <AlertsWidget
              alerts={alerts}
              onAddAlert={() => setIsAlertPanelOpen(true)}
              onDeleteAlert={handleDeleteAlert}
            />
          </div>
        </ResponsiveGridLayout>
      </div>

      <AlertConfigPanel
        isOpen={isAlertPanelOpen}
        onClose={() => setIsAlertPanelOpen(false)}
        onSave={(config) => {
          const newAlert = { ...config, triggered: false, lastTriggered: undefined };
          setAlerts(prev => [...prev, newAlert as typeof alerts[0]]);
          console.log('Alert saved:', config);
        }}
      />
    </div>
  );
}
