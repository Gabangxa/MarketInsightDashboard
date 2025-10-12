import { useState } from "react";
import WebhookWidget from '../WebhookWidget';

export default function WebhookWidgetExample() {
  const [messages, setMessages] = useState([
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
    },
    {
      id: "4",
      source: "News",
      message: "Major announcement from Federal Reserve regarding interest rates",
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      bookmarked: true
    },
  ]);

  const handleToggleBookmark = (id: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, bookmarked: !msg.bookmarked } : msg
    ));
  };

  return (
    <WebhookWidget
      messages={messages}
      onToggleBookmark={handleToggleBookmark}
    />
  );
}
