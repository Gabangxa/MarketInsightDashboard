import MarketDataWidget from '../MarketDataWidget';

export default function MarketDataWidgetExample() {
  return (
    <MarketDataWidget
      data={{
        symbol: "BTCUSDT",
        price: 67234.56,
        priceChange: 1234.56,
        priceChangePercent: 1.87,
        volume: 42500000000,
        exchanges: ["Binance", "Bybit"]
      }}
      onConfigure={() => console.log('Configure clicked')}
    />
  );
}
