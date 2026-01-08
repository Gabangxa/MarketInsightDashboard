import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  CandlestickData, 
  LineData,
  CandlestickSeries,
  LineSeries,
  LogicalRange,
  Time
} from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, TrendingUp } from "lucide-react";
import { fetchHistoricalCandles, type Candle } from "@/lib/fetchHistoricalCandles";
import { calculateAllIndicators, type PriceData } from "@/lib/technicalIndicators";

interface ChartWidgetProps {
  symbol: string;
  timeframe: string;
  chartType: "candlestick" | "line";
  priceData: Map<string, any>; // Real-time ticker data (exchange -> data)
  onConfigure?: () => void;
}

const TIMEFRAMES = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1h" },
  { value: "4h", label: "4h" },
  { value: "1d", label: "1d" },
];

const RANGES = [
  { label: "1D", value: "1D", timeframe: "5m", period: "24h" },
  { label: "1W", value: "1W", timeframe: "1h", period: "1w" },
  { label: "1M", value: "1M", timeframe: "4h", period: "1M" },
  { label: "3M", value: "3M", timeframe: "1d", period: "3M" }, // Approximation
  { label: "1Y", value: "1Y", timeframe: "1w", period: "1Y" }, // Approximation
];

export default function ChartWidget({
  symbol,
  timeframe: initialTimeframe,
  chartType,
  priceData: realTimeDataMap,
  onConfigure,
}: ChartWidgetProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | null>(null);
  const indicatorsRef = useRef<Map<string, ISeriesApi<any>>>(new Map());
  const fetchingRef = useRef(false);
  const earliestTimestampRef = useRef<number | null>(null);

  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [activeRange, setActiveRange] = useState("1D");
  const [historicalData, setHistoricalData] = useState<Map<number, Candle>>(new Map());
  const [isChartReady, setIsChartReady] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<string[]>([]);

  // Construct current candle from real-time ticker data
  // This is a naive implementation: it assumes the last historical candle needs to be updated
  // or a new candle started based on the ticker price.
  // Since we don't have a real-time OHLC stream, we'll just update the Close of the latest candle
  // and adjust High/Low if necessary.
  const latestCandle = useMemo(() => {
    // Get best available price (prefer Bybit, then OKX)
    const bybitData = realTimeDataMap.get("Bybit");
    const okxData = realTimeDataMap.get("OKX");
    const data = bybitData || okxData;

    if (!data) return null;

    return {
      timestamp: Date.now(),
      price: data.price,
      volume: data.volume24h, // Not accurate for 1 candle, but placeholder
    };
  }, [realTimeDataMap]);

  // Function to load history
  // periodOverride allows requesting a specific duration (e.g. "1w")
  // otherwise it defaults based on timeframe logic
  const loadHistory = useCallback(async (endTime?: number, periodOverride?: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      // If no override, try to determine based on current timeframe or default
      let period = periodOverride;
      if (!period) {
         // Default logic: load enough for indicators (e.g. 24h for minute bars, 1M for hourly)
         if (timeframe === "1m" || timeframe === "5m" || timeframe === "15m") period = "24h";
         else if (timeframe === "1h" || timeframe === "4h") period = "1M";
         else period = "1Y";
      }

      // Fetch data
      const data = await fetchHistoricalCandles(symbol, timeframe, period, undefined, endTime);

      setHistoricalData(prev => {
        const next = new Map(endTime ? prev : new Map()); // If endTime is set, we are prepending, else replacing
        // If prepending, we merge. If loading fresh (no endTime), we usually replace, but let's be careful.
        // Actually, if we switch range, we want to replace.
        // If we scroll, we want to merge.

        if (!endTime) {
            next.clear();
        }

        data.forEach((val, key) => next.set(key, val));

        // Update earliest timestamp
        const timestamps = Array.from(next.keys()).sort((a, b) => a - b);
        if (timestamps.length > 0) {
          earliestTimestampRef.current = timestamps[0];
        }
        return next;
      });
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      fetchingRef.current = false;
    }
  }, [symbol, timeframe]);

  // Initial load when timeframe changes (but not when range changes effectively, handled by handleRangeChange)
  useEffect(() => {
    // Only trigger if not triggered by range change logic (which sets timeframe and calls loadHistory manually if needed?)
    // Actually simpler: useEffect on timeframe is fine. handleRangeChange just sets timeframe and maybe a ref for "next load period"
    // But `loadHistory` depends on `timeframe`.
    // Let's rely on this effect for timeframe changes.
    // We need to know the *period* though.
    // If we just changed timeframe via dropdown, use default logic.
    // If via range button, we want specific period.

    // Simplification: Just load default history for the timeframe.
    // Range switcher handles its own data loading/setting.
    loadHistory();
  }, [timeframe, loadHistory]);

  // Combine historical and real-time data
  const combinedData = useMemo(() => {
    const sortedHistory = Array.from(historicalData.values()).sort((a, b) => a.timestamp - b.timestamp);

    if (!latestCandle || sortedHistory.length === 0) return sortedHistory;

    const lastCandle = sortedHistory[sortedHistory.length - 1];
    const candleDuration = getDuration(timeframe);

    // Check if current time is within the last candle's bucket
    const isSameBucket = Math.floor(latestCandle.timestamp / candleDuration) === Math.floor(lastCandle.timestamp / candleDuration);

    if (isSameBucket) {
      // Update last candle
      const updated = {
        ...lastCandle,
        close: latestCandle.price,
        high: Math.max(lastCandle.high, latestCandle.price),
        low: Math.min(lastCandle.low, latestCandle.price),
      };
      return [...sortedHistory.slice(0, -1), updated];
    } else {
      // New candle
      const newCandle = {
        timestamp: Math.floor(latestCandle.timestamp / candleDuration) * candleDuration, // Align
        open: latestCandle.price,
        high: latestCandle.price,
        low: latestCandle.price,
        close: latestCandle.price,
        volume: 0
      };
      return [...sortedHistory, newCandle];
    }
  }, [historicalData, latestCandle, timeframe]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#9CA3AF",
      },
      grid: {
        vertLines: { color: "rgba(156, 163, 175, 0.1)" },
        horzLines: { color: "rgba(156, 163, 175, 0.1)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#374151",
      },
      rightPriceScale: {
        borderColor: "#374151",
      },
    } as any);

    chartRef.current = chart;

    if (chartType === "candlestick") {
      seriesRef.current = chart.addSeries(CandlestickSeries, {
        upColor: "#10B981",
        downColor: "#EF4444",
        borderUpColor: "#10B981",
        borderDownColor: "#EF4444",
        wickUpColor: "#10B981",
        wickDownColor: "#EF4444",
      });
    } else {
      seriesRef.current = chart.addSeries(LineSeries, {
        color: "#8B5CF6",
        lineWidth: 2,
      });
    }

    // Subscribe to infinite scrolling
    chart.timeScale().subscribeVisibleLogicalRangeChange((range: LogicalRange | null) => {
      if (range && range.from < 10 && !fetchingRef.current && earliestTimestampRef.current) {
        loadHistory(earliestTimestampRef.current);
      }
    });

    setIsChartReady(true);

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      setIsChartReady(false);
    };
  }, [chartType, loadHistory]);

  // Update chart data
  useEffect(() => {
    if (!isChartReady || !seriesRef.current || combinedData.length === 0) return;

    const mainData = combinedData.map(d => {
      const time = Math.floor(d.timestamp / 1000) as any;
      if (chartType === "candlestick") {
        return { time, open: d.open, high: d.high, low: d.low, close: d.close } as CandlestickData;
      }
      return { time, value: d.close } as LineData;
    });
    seriesRef.current.setData(mainData);

    // Indicators
    const priceDataArray: PriceData[] = combinedData.map(d => ({
      timestamp: d.timestamp,
      open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume
    }));

    const calculated = calculateAllIndicators(priceDataArray);

    // Update indicators
    updateIndicator("sma20", activeIndicators.includes("sma20"), calculated.sma20, { color: '#2962FF', title: 'SMA 20' });
    updateIndicator("ema12", activeIndicators.includes("ema12"), calculated.ema12, { color: '#D500F9', title: 'EMA 12' });

    // RSI (Overlay scaled) - Not ideal but functional for MVP single-pane
    // We render it as a line series but need to handle scaling.
    // Ideally we use a second pane, but let's stick to simple overlays for now or just skip complex ones visually.
    // Let's implement RSI as a separate "chart" logic if we had space, but here we can only overlay.
    // Overlaying RSI (0-100) on Price ($90000) is invisible.
    // So we only support Price-overlay indicators for now: SMA, EMA, Bollinger.
    updateIndicator("bollingerBands", activeIndicators.includes("bollingerBands"), calculated.bollingerBands, { color: '#FF6D00', title: 'BB Upper' }, 'upper');
    // For Bollinger, we need multiple lines (Upper, Lower, SMA).
    // This simple helper only does one line.
    // Implementing proper multi-line indicators requires more code.

  }, [combinedData, isChartReady, chartType, activeIndicators]);

  const updateIndicator = (id: string, active: boolean, data: any, options: any, valueKey: string = 'value') => {
    if (active && data) {
      let series = indicatorsRef.current.get(id);
      if (!series && chartRef.current) {
        series = chartRef.current.addSeries(LineSeries, { lineWidth: 1, ...options });
        indicatorsRef.current.set(id, series);
      }
      if (series) {
        series.setData(data.values.map((v: any) => ({
            time: Math.floor(v.timestamp / 1000) as any,
            value: valueKey === 'value' ? v.value : v.metadata?.[valueKey]
        })));
      }
    } else {
      const series = indicatorsRef.current.get(id);
      if (series && chartRef.current) {
        chartRef.current.removeSeries(series);
        indicatorsRef.current.delete(id);
      }
    }
  };

  const toggleIndicator = (id: string) => {
    setActiveIndicators(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleRangeChange = (range: any) => {
    setActiveRange(range.value);
    setTimeframe(range.timeframe);
    // Force load history with the new period
    // Since setTimeframe triggers the effect, we might get a race or double load.
    // To be safe and explicit, we can just let the effect handle it,
    // BUT the effect logic above defaults 'period' based on timeframe.
    // We want to enforce the range period.

    // We'll update the effect to check `activeRange`? No, too coupled.
    // Better: Explicitly call loadHistory here and update state.
    // But `timeframe` change will trigger another load.

    // Refined approach: `loadHistory` takes (endTime, period).
    loadHistory(undefined, range.period);
  };

  return (
    <Card className="h-full flex flex-col" data-testid="widget-chart">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 p-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-purple-500" />
          <CardTitle className="text-sm font-medium">
            {symbol}
          </CardTitle>

          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="h-7 w-[70px] text-xs" data-testid="select-chart-timeframe">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {TIMEFRAMES.map(tf => (
                    <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
            {RANGES.map(range => (
              <Button
                key={range.value}
                variant={activeRange === range.value ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => handleRangeChange(range)}
              >
                {range.label}
              </Button>
            ))}
            <div className="w-px h-4 bg-border mx-1" />
            <Button
                variant={activeIndicators.includes("sma20") ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => toggleIndicator("sma20")}
            >
                SMA
            </Button>
            <Button
                variant={activeIndicators.includes("ema12") ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => toggleIndicator("ema12")}
            >
                EMA
            </Button>
            <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onConfigure}
            data-testid="button-chart-configure"
            >
            <Settings className="h-4 w-4" />
            </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-2 min-h-0">
        <div ref={chartContainerRef} className="w-full h-full" data-testid="chart-container" />
      </CardContent>
    </Card>
  );
}

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
    return map[timeframe] || 60 * 1000;
}
