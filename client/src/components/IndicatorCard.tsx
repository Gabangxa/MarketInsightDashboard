import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { IndicatorResult } from "@/lib/technicalIndicators";

type Signal = "buy" | "sell" | "hold";

function getSignalIcon(signal?: Signal) {
  switch (signal) {
    case "buy":
      return <ArrowUpCircle className="h-4 w-4 text-positive" />;
    case "sell":
      return <ArrowDownCircle className="h-4 w-4 text-negative" />;
    default:
      return <CircleDot className="h-4 w-4 text-muted-foreground" />;
  }
}

function getSignalColor(signal?: Signal) {
  switch (signal) {
    case "buy":
      return "text-positive bg-positive/10 border-positive/40";
    case "sell":
      return "text-negative bg-negative/10 border-negative/40";
    default:
      return "text-muted-foreground bg-muted border-border";
  }
}

function formatValue(indicator: IndicatorResult): string {
  if (!indicator.lastValue) return "N/A";
  const { value } = indicator.lastValue;
  if (
    indicator.name.includes("RSI") ||
    indicator.name.includes("Stoch") ||
    indicator.name.includes("Williams") ||
    indicator.name.includes("MFI") ||
    indicator.name.includes("ADX")
  )
    return value.toFixed(1);
  if (indicator.name.includes("MACD")) return value.toFixed(4);
  if (indicator.name.includes("ROC") || indicator.name.includes("ChaikinVol"))
    return value.toFixed(2) + "%";
  return value.toFixed(2);
}

function getDescription(indicator: IndicatorResult): string {
  if (!indicator.lastValue) return "No data available";
  const { value, metadata } = indicator.lastValue;

  if (indicator.name.includes("RSI")) {
    if (value <= 30) return "Oversold condition - potential buying opportunity";
    if (value >= 70) return "Overbought condition - potential selling pressure";
    return "Neutral momentum";
  }
  if (indicator.name.includes("MACD")) {
    const histogram = metadata?.histogram || 0;
    if (histogram > 0) return "Bullish momentum building";
    if (histogram < 0) return "Bearish momentum building";
    return "Momentum at equilibrium";
  }
  if (indicator.name.includes("Bollinger")) {
    const position = metadata?.position || 50;
    if (position <= 10) return "Price near lower band - oversold";
    if (position >= 90) return "Price near upper band - overbought";
    return `Price at ${position.toFixed(0)}% of band range`;
  }
  if (indicator.name.includes("Stoch")) {
    if (value <= 20) return "Oversold - potential upward reversal";
    if (value >= 80) return "Overbought - potential downward reversal";
    return "Neutral oscillator reading";
  }
  if (indicator.name.includes("PSAR")) {
    const direction = metadata?.direction ?? 0;
    return direction > 0 ? "Bullish — price above SAR" : "Bearish — price below SAR";
  }
  if (indicator.name.includes("ROC")) {
    if (value > 5) return "Positive momentum accelerating";
    if (value < -5) return "Negative momentum accelerating";
    return value >= 0 ? "Slight positive momentum" : "Slight negative momentum";
  }
  if (indicator.name.includes("MFI")) {
    if (value < 20) return "Oversold — buying pressure may be exhausted";
    if (value > 80) return "Overbought — selling pressure may be exhausted";
    return "Neutral money flow";
  }
  if (indicator.name.includes("ChaikinVol")) {
    if (value > 0) return "Volatility expanding";
    if (value < 0) return "Volatility contracting";
    return "Volatility unchanged";
  }
  if (indicator.name.includes("ADX")) {
    const adx = metadata?.adx ?? value;
    if (adx < 25) return "Weak / No Trend";
    if (adx < 50) return "Moderate Trend";
    if (adx < 75) return "Strong Trend";
    return "Very Strong Trend";
  }
  return `Current value: ${formatValue(indicator)}`;
}

interface IndicatorCardProps {
  indicatorId: string;
  indicator: IndicatorResult;
}

export default function IndicatorCard({
  indicatorId,
  indicator,
}: IndicatorCardProps) {
  const signal = (indicator.lastValue?.signal ?? "hold") as Signal;
  const value = formatValue(indicator);
  const description = getDescription(indicator);

  return (
    <div
      className="p-3 bg-accent/20 rounded-lg border hover-elevate"
      data-testid={`indicator-${indicatorId}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">{indicator.name}</h4>
          {getSignalIcon(signal)}
        </div>
        <div className="text-right">
          <div className="text-lg font-mono font-bold">{value}</div>
          <Badge
            variant="outline"
            className={cn("text-xs capitalize", getSignalColor(signal))}
          >
            {signal}
          </Badge>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-2">{description}</p>

      {/* RSI Progress Bar */}
      {indicatorId === "rsi" && indicator.lastValue && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Oversold (30)</span>
            <span>Overbought (70)</span>
          </div>
          <Progress value={indicator.lastValue.value} className="h-2" />
        </div>
      )}

      {/* Stochastic Details */}
      {indicatorId === "stochastic" && indicator.lastValue && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>%K: {indicator.lastValue.value.toFixed(1)}</span>
            <span>
              %D: {indicator.lastValue.metadata?.d?.toFixed(1) ?? "N/A"}
            </span>
          </div>
          <Progress value={indicator.lastValue.value} className="h-2" />
        </div>
      )}

      {/* MACD Details */}
      {indicatorId === "macd" && indicator.lastValue?.metadata && (
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">MACD:</span>
            <div className="font-mono">
              {indicator.lastValue.metadata.macd?.toFixed(4)}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Signal:</span>
            <div className="font-mono">
              {indicator.lastValue.metadata.signal?.toFixed(4)}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Histogram:</span>
            <div
              className={cn(
                "font-mono",
                indicator.lastValue.metadata.histogram > 0
                  ? "text-positive"
                  : "text-negative"
              )}
            >
              {indicator.lastValue.metadata.histogram?.toFixed(4)}
            </div>
          </div>
        </div>
      )}

      {/* Bollinger Bands Details */}
      {indicatorId === "bollingerBands" && indicator.lastValue?.metadata && (
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Upper:</span>
            <div className="font-mono">
              {indicator.lastValue.metadata.upperBand?.toFixed(2)}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">SMA:</span>
            <div className="font-mono">
              {indicator.lastValue.metadata.sma?.toFixed(2)}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Lower:</span>
            <div className="font-mono">
              {indicator.lastValue.metadata.lowerBand?.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* MFI Progress Bar */}
      {indicatorId === "mfi" && indicator.lastValue && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Oversold (20)</span>
            <span>Overbought (80)</span>
          </div>
          <Progress value={indicator.lastValue.value} className="h-2" />
        </div>
      )}

      {/* ADX Details */}
      {indicatorId === "adx" && indicator.lastValue?.metadata && (
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">ADX:</span>
            <div className="font-mono">
              {indicator.lastValue.metadata.adx?.toFixed(1)}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">+DI:</span>
            <div className={cn("font-mono", "text-positive")}>
              {indicator.lastValue.metadata.plusDI?.toFixed(1)}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">−DI:</span>
            <div className={cn("font-mono", "text-negative")}>
              {indicator.lastValue.metadata.minusDI?.toFixed(1)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
