export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Map our timeframe format to exchange-specific formats
const timeframeMap = {
  binance: {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "1h",
    "4h": "4h",
    "1d": "1d",
    "1w": "1w",
    "1M": "1M",
  },
  bybit: {
    "1m": "1",
    "5m": "5",
    "15m": "15",
    "30m": "30",
    "1h": "60",
    "4h": "240",
    "1d": "D",
    "1w": "W",
    "1M": "M",
  },
  okx: {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "1H",
    "4h": "4H",
    "1d": "1D",
    "1w": "1W",
    "1M": "1M",
  },
};

// Calculate number of candles needed based on period and timeframe
function calculateCandleCount(period: string, timeframe: string): number {
  const periodMs: Record<string, number> = {
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "1w": 7 * 24 * 60 * 60 * 1000,
    "1M": 30 * 24 * 60 * 60 * 1000,
  };

  const timeframeMs: Record<string, number> = {
    "1m": 60 * 1000,
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "30m": 30 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "1w": 7 * 24 * 60 * 60 * 1000,
    "1M": 30 * 24 * 60 * 60 * 1000,
  };

  const periodDuration = periodMs[period] || periodMs["24h"];
  const candleDuration = timeframeMs[timeframe] || timeframeMs["1h"];
  
  // Calculate number of candles, with max limit of 1000 for API limits
  return Math.min(Math.ceil(periodDuration / candleDuration), 1000);
}

// Fetch from Binance
async function fetchBinance(
  symbol: string,
  timeframe: string,
  limit: number
): Promise<Candle[]> {
  try {
    const interval = timeframeMap.binance[timeframe as keyof typeof timeframeMap.binance];
    if (!interval) return [];

    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url);
    
    if (!response.ok) return [];

    const data = await response.json();
    
    return data.map((k: any[]) => ({
      timestamp: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  } catch (error) {
    console.error("Binance fetch error:", error);
    return [];
  }
}

// Fetch from Bybit
async function fetchBybit(
  symbol: string,
  timeframe: string,
  limit: number
): Promise<Candle[]> {
  try {
    const interval = timeframeMap.bybit[timeframe as keyof typeof timeframeMap.bybit];
    if (!interval) return [];

    // Bybit uses spot endpoint
    const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url);
    
    if (!response.ok) return [];

    const data = await response.json();
    
    if (data.retCode !== 0 || !data.result?.list) return [];

    return data.result.list.map((k: any[]) => ({
      timestamp: parseInt(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  } catch (error) {
    console.error("Bybit fetch error:", error);
    return [];
  }
}

// Fetch from OKX
async function fetchOKX(
  symbol: string,
  timeframe: string,
  limit: number
): Promise<Candle[]> {
  try {
    const interval = timeframeMap.okx[timeframe as keyof typeof timeframeMap.okx];
    if (!interval) return [];

    // OKX uses instId format like BTC-USDT
    const instId = symbol.replace("USDT", "-USDT");
    
    const url = `https://www.okx.com/api/v5/market/candles?instId=${instId}&bar=${interval}&limit=${limit}`;
    const response = await fetch(url);
    
    if (!response.ok) return [];

    const data = await response.json();
    
    if (data.code !== "0" || !data.data) return [];

    return data.data.map((k: any[]) => ({
      timestamp: parseInt(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  } catch (error) {
    console.error("OKX fetch error:", error);
    return [];
  }
}

// Main function to fetch historical candles from all exchanges
export async function fetchHistoricalCandles(
  symbol: string,
  timeframe: string,
  period: string,
  exchanges: string[] = ["binance", "bybit", "okx"]
): Promise<Map<number, Candle>> {
  const limit = calculateCandleCount(period, timeframe);
  
  // Normalize exchange names to lowercase for case-insensitive matching
  const normalizedExchanges = exchanges.map(ex => ex.toLowerCase());
  
  // Warn if no exchanges provided
  if (normalizedExchanges.length === 0) {
    console.warn('[Historical] No exchanges provided, defaulting to bybit and okx');
    normalizedExchanges.push("bybit", "okx");
  }
  
  console.log(`[Historical] Fetching ${limit} candles for ${symbol} ${timeframe} over ${period} from [${normalizedExchanges.join(', ')}]`);

  const promises: Promise<Candle[]>[] = [];

  if (normalizedExchanges.includes("binance")) {
    promises.push(fetchBinance(symbol, timeframe, limit));
  }
  if (normalizedExchanges.includes("bybit")) {
    promises.push(fetchBybit(symbol, timeframe, limit));
  }
  if (normalizedExchanges.includes("okx")) {
    promises.push(fetchOKX(symbol, timeframe, limit));
  }

  const results = await Promise.all(promises);
  
  // Merge candles from all exchanges by timestamp
  const candleMap = new Map<number, Candle>();
  
  for (const candleArray of results) {
    for (const candle of candleArray) {
      const existing = candleMap.get(candle.timestamp);
      
      if (!existing) {
        candleMap.set(candle.timestamp, candle);
      } else {
        // Average the values if we have multiple sources for same timestamp
        candleMap.set(candle.timestamp, {
          timestamp: candle.timestamp,
          open: (existing.open + candle.open) / 2,
          high: Math.max(existing.high, candle.high),
          low: Math.min(existing.low, candle.low),
          close: (existing.close + candle.close) / 2,
          volume: existing.volume + candle.volume,
        });
      }
    }
  }

  console.log(`[Historical] Fetched ${candleMap.size} candles from ${results.filter(r => r.length > 0).length} exchanges`);

  return candleMap;
}
