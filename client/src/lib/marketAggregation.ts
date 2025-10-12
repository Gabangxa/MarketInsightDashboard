import type { MarketData, OrderBookData } from "./useMarketWebSocket";

export interface AggregatedMarketData {
  symbol: string;
  price: number; // Best price
  priceChange: number;
  priceChangePercent: number;
  volume24hUSDT: number;
  allTimeHigh: number;
  allTimeLow: number;
  exchanges: string[];
  bestBid: number;
  bestAsk: number;
}

export interface AggregatedOrderBook {
  symbol: string;
  bids: Array<{ price: number; size: number; total: number; exchange?: string }>;
  asks: Array<{ price: number; size: number; total: number; exchange?: string }>;
  spread: number;
  spreadPercent: number;
  exchanges: string[];
}

export function aggregateMarketData(
  symbol: string,
  exchangeData: Map<string, MarketData>
): AggregatedMarketData | null {
  if (exchangeData.size === 0) return null;

  const dataArray = Array.from(exchangeData.values());
  
  // Get best (highest) bid and best (lowest) ask from all exchanges
  const prices = dataArray.map(d => d.price);
  const bestPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  
  // Calculate weighted average change
  const totalVolume = dataArray.reduce((sum, d) => sum + d.volume24h, 0);
  const weightedChange = dataArray.reduce((sum, d) => {
    const weight = d.volume24h / totalVolume;
    return sum + (d.priceChange24h * weight);
  }, 0);

  // Estimate ATH and ATL (in real app, this would come from API)
  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  
  return {
    symbol,
    price: avgPrice,
    priceChange: avgPrice * (weightedChange / 100),
    priceChangePercent: weightedChange,
    volume24hUSDT: totalVolume,
    allTimeHigh: avgPrice * 1.15, // Mock: 15% above current
    allTimeLow: avgPrice * 0.45, // Mock: 55% below current
    exchanges: dataArray.map(d => d.exchange),
    bestBid: Math.max(...prices),
    bestAsk: Math.min(...prices),
  };
}

export function aggregateOrderBook(
  symbol: string,
  exchangeOrderBooks: Map<string, OrderBookData>
): AggregatedOrderBook | null {
  if (exchangeOrderBooks.size === 0) return null;

  const allBids: Array<{ price: number; size: number; exchange: string }> = [];
  const allAsks: Array<{ price: number; size: number; exchange: string }> = [];

  exchangeOrderBooks.forEach((ob, exchange) => {
    ob.bids.forEach(([price, size]) => {
      allBids.push({ price, size, exchange });
    });
    ob.asks.forEach(([price, size]) => {
      allAsks.push({ price, size, exchange });
    });
  });

  // Group by price and sum sizes
  const bidMap = new Map<number, { size: number; exchanges: string[] }>();
  allBids.forEach(({ price, size, exchange }) => {
    const existing = bidMap.get(price) || { size: 0, exchanges: [] };
    existing.size += size;
    if (!existing.exchanges.includes(exchange)) {
      existing.exchanges.push(exchange);
    }
    bidMap.set(price, existing);
  });

  const askMap = new Map<number, { size: number; exchanges: string[] }>();
  allAsks.forEach(({ price, size, exchange }) => {
    const existing = askMap.get(price) || { size: 0, exchanges: [] };
    existing.size += size;
    if (!existing.exchanges.includes(exchange)) {
      existing.exchanges.push(exchange);
    }
    askMap.set(price, existing);
  });

  // Sort and limit to top 5
  const sortedBids = Array.from(bidMap.entries())
    .sort(([a], [b]) => b - a) // Highest first
    .slice(0, 5);
  
  const sortedAsks = Array.from(askMap.entries())
    .sort(([a], [b]) => a - b) // Lowest first
    .slice(0, 5);

  // Calculate totals
  let bidTotal = 0;
  const bids = sortedBids.map(([price, { size }]) => {
    bidTotal += price * size;
    return { price, size, total: bidTotal };
  });

  let askTotal = 0;
  const asks = sortedAsks.map(([price, { size }]) => {
    askTotal += price * size;
    return { price, size, total: askTotal };
  });

  const bestBid = bids[0]?.price || 0;
  const bestAsk = asks[0]?.price || 0;
  const spread = bestAsk - bestBid;
  const spreadPercent = (spread / bestBid) * 100;

  return {
    symbol,
    bids,
    asks,
    spread,
    spreadPercent,
    exchanges: Array.from(new Set([
      ...Array.from(exchangeOrderBooks.keys())
    ])),
  };
}
