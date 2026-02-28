import { useEffect, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  CandlestickSeries,
  LineSeries,
  LogicalRange,
} from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, TrendingUp } from "lucide-react";
import { calculateAllIndicators, type PriceData } from "@/lib/technicalIndicators";
import { useChartData, CHART_RANGES } from "@/hooks/useChartData";
import type { MarketData } from "@shared/types";

interface ChartWidgetProps {
  symbol: string;
  timeframe: string;
  chartType: "candlestick" | "line";
  /** Real-time ticker data per exchange for this symbol */
  priceData: Map<string, MarketData>;
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

export default function ChartWidget({
  symbol,
  timeframe: initialTimeframe,
  chartType,
  priceData: realTimeDataMap,
  onConfigure,
}: ChartWidgetProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<
    ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | null
  >(null);
  const indicatorsRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());

  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [activeRange, setActiveRange] = useState("1D");
  const [isChartReady, setIsChartReady] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<string[]>([]);

  const { combinedData, loadHistory, fetchingRef, earliestTimestampRef } =
    useChartData({ symbol, timeframe, realTimeDataMap });

  // Initial load on timeframe change
  useEffect(() => {
    loadHistory();
  }, [timeframe, loadHistory]);

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
    });

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

    chart.timeScale().subscribeVisibleLogicalRangeChange((range: LogicalRange | null) => {
      if (
        range &&
        range.from < 10 &&
        !fetchingRef.current &&
        earliestTimestampRef.current
      ) {
        loadHistory(earliestTimestampRef.current);
      }
    });

    setIsChartReady(true);

    const resizeObserver = new ResizeObserver(() => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      setIsChartReady(false);
    };
  }, [chartType, loadHistory, fetchingRef, earliestTimestampRef]);

  // Update chart data
  useEffect(() => {
    if (!isChartReady || !seriesRef.current || combinedData.length === 0) return;

    const mainData = combinedData.map((d) => {
      const time = Math.floor(d.timestamp / 1000) as unknown as number;
      if (chartType === "candlestick") {
        return {
          time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        } as CandlestickData;
      }
      return { time, value: d.close } as LineData;
    });
    seriesRef.current.setData(mainData);

    const priceDataArray: PriceData[] = combinedData.map((d) => ({
      timestamp: d.timestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }));
    const calculated = calculateAllIndicators(priceDataArray);

    updateIndicator("sma20", activeIndicators.includes("sma20"), calculated.sma20, {
      color: "#2962FF",
      title: "SMA 20",
    });
    updateIndicator("ema12", activeIndicators.includes("ema12"), calculated.ema12, {
      color: "#D500F9",
      title: "EMA 12",
    });
    updateIndicator(
      "bollingerBands",
      activeIndicators.includes("bollingerBands"),
      calculated.bollingerBands,
      { color: "#FF6D00", title: "BB Upper" },
      "upper"
    );
  }, [combinedData, isChartReady, chartType, activeIndicators]);

  function updateIndicator(
    id: string,
    active: boolean,
    data: ReturnType<typeof calculateAllIndicators>[string] | undefined,
    options: { color: string; title: string },
    valueKey = "value"
  ) {
    if (active && data) {
      let series = indicatorsRef.current.get(id);
      if (!series && chartRef.current) {
        series = chartRef.current.addSeries(LineSeries, {
          lineWidth: 1,
          ...options,
        });
        indicatorsRef.current.set(id, series);
      }
      if (series) {
        series.setData(
          data.values.map((v) => ({
            time: Math.floor(v.timestamp / 1000) as unknown as number,
            value:
              valueKey === "value"
                ? v.value
                : (v.metadata?.[valueKey] as number),
          }))
        );
      }
    } else {
      const series = indicatorsRef.current.get(id);
      if (series && chartRef.current) {
        chartRef.current.removeSeries(series);
        indicatorsRef.current.delete(id);
      }
    }
  }

  const toggleIndicator = (id: string) => {
    setActiveIndicators((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleRangeChange = (range: (typeof CHART_RANGES)[number]) => {
    setActiveRange(range.value);
    setTimeframe(range.timeframe);
    loadHistory(undefined, range.period);
  };

  return (
    <Card className="h-full flex flex-col" data-testid="widget-chart">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 p-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-purple-500" />
          <CardTitle className="text-sm font-medium">{symbol}</CardTitle>

          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger
              className="h-7 w-[70px] text-xs"
              data-testid="select-chart-timeframe"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEFRAMES.map((tf) => (
                <SelectItem key={tf.value} value={tf.value}>
                  {tf.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          {CHART_RANGES.map((range) => (
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
        <div
          ref={chartContainerRef}
          className="w-full h-full"
          data-testid="chart-container"
        />
      </CardContent>
    </Card>
  );
}
