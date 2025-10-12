import { useState } from "react";
import WatchlistWidget from '../WatchlistWidget';

export default function WatchlistWidgetExample() {
  const [tokens, setTokens] = useState([
    {
      symbol: "BTCUSDT",
      price: 67234.56,
      change24h: 1.87,
      volume24h: 42500000000,
      change7d: 5.23
    },
    {
      symbol: "ETHUSDT",
      price: 3245.78,
      change24h: -0.45,
      volume24h: 18300000000,
      change7d: 3.12
    },
    {
      symbol: "BNBUSDT",
      price: 612.34,
      change24h: 2.15,
      volume24h: 1200000000,
      change7d: -1.89
    }
  ]);
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");

  const handleAddToken = (symbol: string) => {
    if (!tokens.find(t => t.symbol === symbol)) {
      setTokens([...tokens, {
        symbol,
        price: Math.random() * 1000 + 100,
        change24h: (Math.random() - 0.5) * 10,
        volume24h: Math.random() * 1000000000,
        change7d: (Math.random() - 0.5) * 20
      }]);
    }
  };

  const handleRemoveToken = (symbol: string) => {
    setTokens(tokens.filter(t => t.symbol !== symbol));
  };

  return (
    <WatchlistWidget
      tokens={tokens}
      selectedSymbol={selectedSymbol}
      onAddToken={handleAddToken}
      onRemoveToken={handleRemoveToken}
      onSelectToken={setSelectedSymbol}
    />
  );
}
