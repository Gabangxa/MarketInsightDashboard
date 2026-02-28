import { useState, useMemo, useCallback, useRef } from "react";
import { fetchHistoricalCandles, type Candle } from "@/lib/fetchHistoricalCandles";
import type { MarketData } from "@shared/types";

export interface ChartRange {
  label: string;
  value: string;
  timeframe: string;
  period: string;
}

export const CHART_RANGES: ChartRange[] = [
  { label: "1D", value: "1D", timeframe: "5m", period: "24h" },
  { label: "1W", value: "1W", timeframe: "1h", period: "1w" },
  { label: "1M", value: "1M", timeframe: "4h", period: "1M" },
  { label: "3M", value: "3M", timeframe: "1d", period: "3M" },
  { label: "1Y", value: "1Y", timeframe: "1w", period: "1Y" },
];

function getDuration(timeframe: string): number {
  const map: Record<string, number> = {
    "1m": 60 * 1000,
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "1w": 7 * 24 * 60 * 60 * 1000,
  };
  return map[timeframe] ?? 60 * 1000;
}

interface UseChartDataOptions {
  symbol: string;
  timeframe: string;
  realTimeDataMap: Map<string, MarketData>;
}

export function useChartData({ symbol, timeframe, realTimeDataMap }: UseChartDataOptions) {
  const [historicalData, setHistoricalData] = useState<Map<number, Candle>>(new Map());
  const fetchingRef = useRef(false);
  const earliestTimestampRef = useRef<number | null>(null);

  const loadHistory = useCallback(
    async (endTime?: number, periodOverride?: string) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      try {
        let period = periodOverride;
        if (!period) {
          if (timeframe === "1m" || timeframe === "5m" || timeframe === "15m")
            period = "24h";
          else if (timeframe === "1h" || timeframe === "4h") period = "1M";
          else period = "1Y";
        }

        const data = await fetchHistoricalCandles(symbol, timeframe, period, undefined, endTime);

        setHistoricalData((prev) => {
          const next = new Map(endTime ? prev : new Map<number, Candle>());
          if (!endTime) next.clear();
          data.forEach((val, key) => next.set(key, val));

          const timestamps = Array.from(next.keys()).sort((a, b) => a - b);
          if (timestamps.length > 0) {
            earliestTimestampRef.current = timestamps[0];
          }
          return next;
        });
      } catch (error) {
        console.error("Error loading chart history:", error);
      } finally {
        fetchingRef.current = false;
      }
    },
    [symbol, timeframe]
  );

  /** Latest real-time tick for the current symbol, preferring Bybit over OKX */
  const latestTick = useMemo(() => {
    const bybit = realTimeDataMap.get("Bybit");
    const okx = realTimeDataMap.get("OKX");
    const data = bybit ?? okx;
    if (!data) return null;
    return { timestamp: Date.now(), price: data.price, volume: data.volume24h };
  }, [realTimeDataMap]);

  /** Historical data merged with the latest real-time tick */
  const combinedData = useMemo(() => {
    const sorted = Array.from(historicalData.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );
    if (!latestTick || sorted.length === 0) return sorted;

    const last = sorted[sorted.length - 1];
    const duration = getDuration(timeframe);
    const isSameBucket =
      Math.floor(latestTick.timestamp / duration) ===
      Math.floor(last.timestamp / duration);

    if (isSameBucket) {
      const updated = {
        ...last,
        close: latestTick.price,
        high: Math.max(last.high, latestTick.price),
        low: Math.min(last.low, latestTick.price),
      };
      return [...sorted.slice(0, -1), updated];
    }

    return [
      ...sorted,
      {
        timestamp: Math.floor(latestTick.timestamp / duration) * duration,
        open: latestTick.price,
        high: latestTick.price,
        low: latestTick.price,
        close: latestTick.price,
        volume: 0,
      },
    ];
  }, [historicalData, latestTick, timeframe]);

  return {
    combinedData,
    loadHistory,
    fetchingRef,
    earliestTimestampRef,
  };
}
