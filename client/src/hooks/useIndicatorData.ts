import { useState, useEffect, useMemo } from "react";
import { useSymbol } from "@/contexts/SymbolContext";
import { calculateAllIndicators, type PriceData } from "@/lib/technicalIndicators";
import {
  fetchHistoricalCandles,
  type Candle,
  MINIMUM_CANDLES_FOR_INDICATORS,
} from "@/lib/fetchHistoricalCandles";

export interface UseIndicatorDataReturn {
  symbol: string;
  timeframe: string;
  setTimeframe: (tf: string) => void;
  period: string;
  setPeriod: (p: string) => void;
  historicalData: Map<number, Candle>;
  isLoading: boolean;
  error: string | null;
  indicators: ReturnType<typeof calculateAllIndicators>;
}

export function useIndicatorData(exchanges: string[] = ["bybit"]): UseIndicatorDataReturn {
  const { selectedSymbol: symbol } = useSymbol();
  const [timeframe, setTimeframe] = useState("1h");
  const [period, setPeriod] = useState("24h");
  const [historicalData, setHistoricalData] = useState<Map<number, Candle>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const candles = await fetchHistoricalCandles(symbol, timeframe, period, exchanges);
        if (cancelled) return;
        setHistoricalData(candles);
        if (candles.size === 0) {
          setError("No data available");
        } else if (candles.size < MINIMUM_CANDLES_FOR_INDICATORS) {
          setError(`Insufficient data: ${candles.size}/${MINIMUM_CANDLES_FOR_INDICATORS} candles`);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch historical data:", err);
          setError("Failed to load data");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe, period]);

  const indicators = useMemo(() => {
    if (historicalData.size < MINIMUM_CANDLES_FOR_INDICATORS) return {};
    try {
      const priceData: PriceData[] = Array.from(historicalData.values())
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((c) => ({
          timestamp: c.timestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        }));
      return calculateAllIndicators(priceData);
    } catch (err) {
      console.error("Error calculating indicators:", err);
      return {};
    }
  }, [historicalData]);

  return { symbol, timeframe, setTimeframe, period, setPeriod, historicalData, isLoading, error, indicators };
}
