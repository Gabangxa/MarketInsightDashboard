import { MINIMUM_CANDLES_FOR_INDICATORS } from './constants';

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Re-export for convenience
export { MINIMUM_CANDLES_FOR_INDICATORS };

// Main function to fetch historical candles from backend proxy
export async function fetchHistoricalCandles(
  symbol: string,
  timeframe: string,
  period: string,
  exchanges: string[] = ["binance", "bybit", "okx"],
  endTime?: number
): Promise<Map<number, Candle>> {
  // Normalize exchange names
  const normalizedExchanges = exchanges.map(ex => ex.toLowerCase());
  if (normalizedExchanges.length === 0) {
    normalizedExchanges.push("bybit", "okx");
  }

  try {
    const params = new URLSearchParams({
      symbol,
      timeframe,
      period,
      exchanges: normalizedExchanges.join(",")
    });

    if (endTime) {
      params.append("endTime", endTime.toString());
    }

    const response = await fetch(`/api/historical-data?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Failed to fetch historical data");
    }

    const candles: Candle[] = await response.json();
    const candleMap = new Map<number, Candle>();

    candles.forEach(candle => {
      candleMap.set(candle.timestamp, candle);
    });

    console.log(`[Historical] Fetched ${candleMap.size} candles via backend${endTime ? ` ending at ${endTime}` : ''}`);
    return candleMap;
  } catch (error) {
    console.error("Historical data fetch error:", error);
    return new Map();
  }
}
