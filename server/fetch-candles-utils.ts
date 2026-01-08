// Minimum candles required for accurate technical indicator calculations
export const MINIMUM_CANDLES_FOR_INDICATORS = 100;

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const timeframeMap = {
  binance: {
    "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m",
    "1h": "1h", "4h": "4h", "1d": "1d", "1w": "1w", "1M": "1M",
  },
  bybit: {
    "1m": "1", "5m": "5", "15m": "15", "30m": "30",
    "1h": "60", "4h": "240", "1d": "D", "1w": "W", "1M": "M",
  },
  okx: {
    "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m",
    "1h": "1H", "4h": "4H", "1d": "1D", "1w": "1W", "1M": "1M",
  },
};

export function calculateCandleCount(period: string, timeframe: string): number {
  const periodMs: Record<string, number> = {
    "1h": 3600000, "4h": 14400000, "24h": 86400000, "1w": 604800000, "1M": 2592000000,
  };
  const timeframeMs: Record<string, number> = {
    "1m": 60000, "5m": 300000, "15m": 900000, "30m": 1800000,
    "1h": 3600000, "4h": 14400000, "1d": 86400000, "1w": 604800000, "1M": 2592000000,
  };
  const duration = periodMs[period] || periodMs["24h"];
  const candleDuration = timeframeMs[timeframe] || timeframeMs["1h"];
  const count = Math.ceil(duration / candleDuration);
  return Math.min(Math.max(count, MINIMUM_CANDLES_FOR_INDICATORS), 1000);
}

export async function fetchBinance(symbol: string, timeframe: string, limit: number, endTime?: number): Promise<Candle[]> {
  const interval = timeframeMap.binance[timeframe as keyof typeof timeframeMap.binance];
  if (!interval) {
    console.log(`[Binance] Invalid timeframe: ${timeframe}`);
    return [];
  }
  let url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  if (endTime) {
    url += `&endTime=${endTime}`;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[Binance] HTTP ${res.status}: ${res.statusText} for ${symbol}`);
      return [];
    }
    const data = await res.json();
    console.log(`[Binance] Fetched ${data.length} candles for ${symbol}`);
    return data.map((k: any[]) => ({
      timestamp: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5])
    }));
  } catch (error) {
    console.error(`[Binance] Fetch error for ${symbol}:`, error);
    return [];
  }
}

export async function fetchBybit(symbol: string, timeframe: string, limit: number, endTime?: number): Promise<Candle[]> {
  const interval = timeframeMap.bybit[timeframe as keyof typeof timeframeMap.bybit];
  if (!interval) {
    console.log(`[Bybit] Invalid timeframe: ${timeframe}`);
    return [];
  }
  let url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&limit=${limit}`;
  if (endTime) {
    url += `&end=${endTime}`;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[Bybit] HTTP ${res.status}: ${res.statusText} for ${symbol}`);
      return [];
    }
    const data = await res.json();
    if (data.retCode !== 0 || !data.result?.list) {
      console.error(`[Bybit] API error for ${symbol}: retCode=${data.retCode}, msg=${data.retMsg}`);
      return [];
    }
    console.log(`[Bybit] Fetched ${data.result.list.length} candles for ${symbol}`);
    return data.result.list.map((k: any[]) => ({
      timestamp: parseInt(k[0]), open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5])
    })).reverse(); // Bybit returns descending
  } catch (error) {
    console.error(`[Bybit] Fetch error for ${symbol}:`, error);
    return [];
  }
}

export async function fetchOKX(symbol: string, timeframe: string, limit: number, endTime?: number): Promise<Candle[]> {
  const interval = timeframeMap.okx[timeframe as keyof typeof timeframeMap.okx];
  if (!interval) {
    console.log(`[OKX] Invalid timeframe: ${timeframe}`);
    return [];
  }
  const instId = symbol.replace("USDT", "-USDT");
  let url = `https://www.okx.com/api/v5/market/candles?instId=${instId}&bar=${interval}&limit=${limit}`;
  if (endTime) {
    url += `&after=${endTime}`; // OKX uses 'after' for pagination (older than timestamp)
  }
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[OKX] HTTP ${res.status}: ${res.statusText} for ${symbol}`);
      return [];
    }
    const data = await res.json();
    if (data.code !== "0" || !data.data) {
      console.error(`[OKX] API error for ${symbol}: code=${data.code}, msg=${data.msg}`);
      return [];
    }
    console.log(`[OKX] Fetched ${data.data.length} candles for ${symbol}`);
    return data.data.map((k: any[]) => ({
      timestamp: parseInt(k[0]), open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5])
    })).reverse(); // OKX returns descending
  } catch (error) {
    console.error(`[OKX] Fetch error for ${symbol}:`, error);
    return [];
  }
}
