import React, { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  AlertTriangle,
  Activity,
  BarChart3,
  Loader2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSymbol } from "@/contexts/SymbolContext";
import {
  calculateAllIndicators,
  type PriceData,
} from "@/lib/technicalIndicators";
import {
  fetchHistoricalCandles,
  type Candle,
  MINIMUM_CANDLES_FOR_INDICATORS,
} from "@/lib/fetchHistoricalCandles";
import IndicatorCard from "./IndicatorCard";
import IndicatorConfigDialog, {
  type IndicatorConfig,
} from "./IndicatorConfigDialog";

interface TechnicalIndicatorsWidgetProps {
  exchanges?: string[];
  onConfigure?: () => void;
  className?: string;
}

const DEFAULT_INDICATORS: IndicatorConfig[] = [
  {
    id: "sma20",
    name: "SMA 20",
    category: "trend",
    enabled: true,
    description: "20-period Simple Moving Average",
  },
  {
    id: "ema12",
    name: "EMA 12",
    category: "trend",
    enabled: true,
    description: "12-period Exponential Moving Average",
  },
  {
    id: "rsi",
    name: "RSI",
    category: "momentum",
    enabled: true,
    description: "Relative Strength Index (14)",
  },
  {
    id: "macd",
    name: "MACD",
    category: "momentum",
    enabled: true,
    description: "Moving Average Convergence Divergence",
  },
  {
    id: "bollingerBands",
    name: "Bollinger Bands",
    category: "volatility",
    enabled: true,
    description: "Bollinger Bands (20, 2)",
  },
  {
    id: "stochastic",
    name: "Stochastic",
    category: "momentum",
    enabled: false,
    description: "Stochastic Oscillator",
  },
  {
    id: "atr",
    name: "ATR",
    category: "volatility",
    enabled: false,
    description: "Average True Range",
  },
  {
    id: "williamsR",
    name: "Williams %R",
    category: "momentum",
    enabled: false,
    description: "Williams Percent Range",
  },
];

const CATEGORIES = [
  { id: "all", name: "All", icon: BarChart3 },
  { id: "trend", name: "Trend", icon: TrendingUp },
  { id: "momentum", name: "Momentum", icon: Activity },
  { id: "volatility", name: "Volatility", icon: AlertTriangle },
] as const;

export default function TechnicalIndicatorsWidget({
  exchanges = ["bybit"],
  onConfigure,
  className,
}: TechnicalIndicatorsWidgetProps) {
  const { selectedSymbol: symbol } = useSymbol();
  const [indicatorConfigs, setIndicatorConfigs] =
    useState<IndicatorConfig[]>(DEFAULT_INDICATORS);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [timeframe, setTimeframe] = useState<string>("1h");
  const [period, setPeriod] = useState<string>("24h");
  const [historicalData, setHistoricalData] = useState<Map<number, Candle>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistoricalData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const candles = await fetchHistoricalCandles(
          symbol,
          timeframe,
          period,
          exchanges
        );
        setHistoricalData(candles);
        if (candles.size === 0) {
          setError("No data available");
        } else if (candles.size < MINIMUM_CANDLES_FOR_INDICATORS) {
          setError(
            `Insufficient data: ${candles.size}/${MINIMUM_CANDLES_FOR_INDICATORS} candles`
          );
        }
      } catch (err) {
        console.error("Failed to fetch historical data:", err);
        setError("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    loadHistoricalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe, period]);

  const indicators = useMemo(() => {
    if (historicalData.size < MINIMUM_CANDLES_FOR_INDICATORS) return {};
    try {
      const priceData: PriceData[] = Array.from(historicalData.values())
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((candle) => ({
          timestamp: candle.timestamp,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        }));
      return calculateAllIndicators(priceData);
    } catch (err) {
      console.error("Error calculating technical indicators:", err);
      return {};
    }
  }, [historicalData]);

  const enabledIndicators = indicatorConfigs.filter((c) => c.enabled);

  const filteredIndicators =
    selectedCategory === "all"
      ? enabledIndicators
      : enabledIndicators.filter((c) => c.category === selectedCategory);

  const handleToggleIndicator = (indicatorId: string) => {
    setIndicatorConfigs((prev) =>
      prev.map((config) =>
        config.id === indicatorId
          ? { ...config, enabled: !config.enabled }
          : config
      )
    );
  };

  return (
    <Card
      className={cn("h-full p-4 flex flex-col overflow-hidden", className)}
      data-testid="widget-technical-indicators"
    >
      <div className="flex items-start justify-between mb-4 widget-drag-handle cursor-move">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Technical Indicators - {symbol}
            </h3>
            {isLoading && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading
              </Badge>
            )}
            {error && (
              <Badge variant="destructive" className="text-xs">
                {error}
              </Badge>
            )}
            {!isLoading && !error && historicalData.size > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Clock className="h-3 w-3" />
                {timeframe}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {enabledIndicators.length} indicators • {historicalData.size} candles
          </p>
        </div>

        <IndicatorConfigDialog
          open={isConfigOpen}
          onOpenChange={setIsConfigOpen}
          timeframe={timeframe}
          period={period}
          indicatorConfigs={indicatorConfigs}
          defaultIndicators={DEFAULT_INDICATORS}
          onTimeframeChange={setTimeframe}
          onPeriodChange={setPeriod}
          onToggleIndicator={handleToggleIndicator}
        />
      </div>

      {/* Category Filter */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isActive = selectedCategory === category.id;
          const count =
            category.id === "all"
              ? enabledIndicators.length
              : enabledIndicators.filter(
                  (ind) => ind.category === category.id
                ).length;

          return (
            <Button
              key={category.id}
              size="sm"
              variant={isActive ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.id)}
              className="flex items-center gap-1 text-xs flex-shrink-0"
              data-testid={`button-category-${category.id}`}
            >
              <Icon className="h-3 w-3" />
              {category.name}
              <Badge variant="secondary" className="ml-1 text-xs">
                {count}
              </Badge>
            </Button>
          );
        })}
      </div>

      {/* Indicators Display */}
      <div
        className="flex-1 overflow-auto space-y-3 min-h-0"
        data-testid="indicators-list"
      >
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">
              Loading historical data...
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">{error}</p>
          </div>
        ) : Object.keys(indicators).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Need at least {MINIMUM_CANDLES_FOR_INDICATORS} candles</p>
            <p className="text-xs">Currently have: {historicalData.size}</p>
            <p className="text-xs mt-2">Try selecting a longer period</p>
          </div>
        ) : filteredIndicators.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No indicators enabled</p>
            <p className="text-xs">in this category</p>
          </div>
        ) : (
          filteredIndicators.map((config) => {
            const indicator = indicators[config.id];
            if (!indicator) return null;
            return (
              <IndicatorCard
                key={config.id}
                indicatorId={config.id}
                indicator={indicator}
              />
            );
          })
        )}
      </div>
    </Card>
  );
}
