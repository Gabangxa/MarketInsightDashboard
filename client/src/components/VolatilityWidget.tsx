import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIndicatorData } from "@/hooks/useIndicatorData";
import IndicatorCard from "./IndicatorCard";
import { MINIMUM_CANDLES_FOR_INDICATORS } from "@/lib/fetchHistoricalCandles";

const TIMEFRAMES = ["15m", "1h", "4h", "1d"];
const PERIODS = ["6h", "24h", "3d", "7d"];

// Volatility: Bollinger Bands, ATR
const VOLATILITY_IDS = ["bollingerBands", "atr"] as const;

interface Props {
  exchanges?: string[];
}

export default function VolatilityWidget({ exchanges = ["bybit"] }: Props) {
  const { symbol, timeframe, setTimeframe, period, setPeriod, historicalData, isLoading, error, indicators } =
    useIndicatorData(exchanges);

  const volatilityIndicators = VOLATILITY_IDS.map((id) => ({ id, result: indicators[id] })).filter(
    (x) => x.result
  );

  return (
    <Card className="h-full p-4 flex flex-col overflow-hidden" data-testid="widget-volatility">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 widget-drag-handle cursor-move">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Volatility — {symbol}
            </h3>
            {isLoading && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading
              </Badge>
            )}
            {error && <Badge variant="destructive" className="text-xs">{error}</Badge>}
            {!isLoading && !error && historicalData.size > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Clock className="h-3 w-3" />
                {timeframe}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Bollinger Bands · ATR
          </p>
        </div>

        <div className="flex gap-1.5">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="h-6 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEFRAMES.map((tf) => (
                <SelectItem key={tf} value={tf}>{tf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-6 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto space-y-3 min-h-0" data-testid="volatility-indicators">
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading historical data…</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">{error}</p>
          </div>
        ) : volatilityIndicators.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Need at least {MINIMUM_CANDLES_FOR_INDICATORS} candles</p>
            <p className="text-xs mt-1">Currently have: {historicalData.size} — try a longer period</p>
          </div>
        ) : (
          volatilityIndicators.map(({ id, result }) => (
            <IndicatorCard key={id} indicatorId={id} indicator={result} />
          ))
        )}
      </div>
    </Card>
  );
}
