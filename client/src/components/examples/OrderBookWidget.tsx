import OrderBookWidget from '../OrderBookWidget';

export default function OrderBookWidgetExample() {
  return (
    <OrderBookWidget
      data={{
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
      }}
      onConfigure={() => console.log('Configure clicked')}
    />
  );
}
