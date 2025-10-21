import { useEffect, useRef, useState } from "react";
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  CandlestickData, 
  LineData,
  CandlestickSeries,
  LineSeries
} from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, TrendingUp } from "lucide-react";

interface ChartWidgetProps {
  symbol: string;
  timeframe: string; // "1m", "5m", "15m", "1h", "4h", "1d"
  chartType: "candlestick" | "line";
  priceData: Map<number, { open: number; high: number; low: number; close: number; volume: number }>;
  onConfigure?: () => void;
}

export default function ChartWidget({
  symbol,
  timeframe,
  chartType,
  priceData,
  onConfigure,
}: ChartWidgetProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | null>(null);
  const [isChartReady, setIsChartReady] = useState(false);

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
      watermark: {
        visible: true,
        fontSize: 14,
        horzAlign: "right",
        vertAlign: "bottom",
        color: "rgba(156, 163, 175, 0.3)",
        text: "Powered by TradingView",
      },
    });

    chartRef.current = chart;

    // Add series based on chart type
    if (chartType === "candlestick") {
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#10B981",
        downColor: "#EF4444",
        borderUpColor: "#10B981",
        borderDownColor: "#EF4444",
        wickUpColor: "#10B981",
        wickDownColor: "#EF4444",
      });
      seriesRef.current = candlestickSeries;
    } else {
      const lineSeries = chart.addSeries(LineSeries, {
        color: "#8B5CF6",
        lineWidth: 2,
      });
      seriesRef.current = lineSeries;
    }

    setIsChartReady(true);

    // Handle resize
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
  }, [chartType]);

  // Update chart data when priceData changes
  useEffect(() => {
    if (!isChartReady || !seriesRef.current || priceData.size === 0) return;

    const dataArray = Array.from(priceData.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([timestamp, candle]) => {
        if (chartType === "candlestick") {
          return {
            time: Math.floor(timestamp / 1000) as any,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          } as CandlestickData;
        } else {
          return {
            time: Math.floor(timestamp / 1000) as any,
            value: candle.close,
          } as LineData;
        }
      });

    if (dataArray.length > 0) {
      seriesRef.current.setData(dataArray);
      chartRef.current?.timeScale().fitContent();
    }
  }, [priceData, isChartReady, chartType]);

  const getTimeframeLabel = () => {
    const labels: Record<string, string> = {
      "1m": "1 Minute",
      "5m": "5 Minutes",
      "15m": "15 Minutes",
      "1h": "1 Hour",
      "4h": "4 Hours",
      "1d": "1 Day",
    };
    return labels[timeframe] || timeframe;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-purple-500" />
          <CardTitle className="text-sm font-medium">
            {symbol} - {getTimeframeLabel()}
          </CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onConfigure}
          data-testid="button-chart-configure"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-2">
        <div ref={chartContainerRef} className="w-full h-full" data-testid="chart-container" />
      </CardContent>
    </Card>
  );
}
