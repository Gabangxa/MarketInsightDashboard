import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  CircleDot,
  Loader2,
  Target,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useSymbol } from '@/contexts/SymbolContext';
import {
  calculateFibonacciRetracement,
  type FibonacciResult,
  type PriceData
} from '@/lib/technicalIndicators';
import { fetchHistoricalCandles, type Candle, MINIMUM_CANDLES_FOR_INDICATORS } from '@/lib/fetchHistoricalCandles';

interface FibonacciRetracementWidgetProps {
  exchanges?: string[];
  className?: string;
}

const TIMEFRAME_OPTIONS = [
  { value: '5m', label: '5 Minute' },
  { value: '15m', label: '15 Minute' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hour' },
  { value: '1d', label: '1 Day' },
];

const PERIOD_OPTIONS = [
  { value: '4h', label: '4 Hours' },
  { value: '24h', label: '24 Hours' },
  { value: '1w', label: '1 Week' },
  { value: '1M', label: '1 Month' },
];

const LOOKBACK_OPTIONS = [
  { value: '20', label: '20 Candles' },
  { value: '50', label: '50 Candles' },
  { value: '100', label: '100 Candles' },
  { value: '200', label: '200 Candles' },
];

export default function FibonacciRetracementWidget({
  exchanges = ['bybit', 'okx'],
  className
}: FibonacciRetracementWidgetProps) {
  const { selectedSymbol } = useSymbol();
  const [fibData, setFibData] = useState<FibonacciResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState('1h');
  const [period, setPeriod] = useState('1w');
  const [lookback, setLookback] = useState('50');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!selectedSymbol) return;
      
      setIsLoading(true);
      setError(null);

      try {
        const candleMap = await fetchHistoricalCandles(
          selectedSymbol,
          timeframe,
          period,
          exchanges
        );

        if (!isMounted) return;

        const candleArray = Array.from(candleMap.values())
          .sort((a, b) => a.timestamp - b.timestamp);

        if (candleArray.length < parseInt(lookback)) {
          setError(`Insufficient data (${candleArray.length} candles)`);
          setFibData(null);
          return;
        }

        const priceData: PriceData[] = candleArray.map(c => ({
          timestamp: c.timestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume
        }));

        const result = calculateFibonacciRetracement(priceData, parseInt(lookback));
        setFibData(result);
        setLastUpdate(new Date());
      } catch (err) {
        if (isMounted) {
          setError('Failed to fetch price data');
          console.error('Fibonacci calculation error:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedSymbol, timeframe, period, lookback, exchanges]);

  const getSignalBadge = (signal: 'buy' | 'sell' | 'hold') => {
    switch (signal) {
      case 'buy':
        return (
          <Badge className="gap-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <ArrowUpCircle className="h-3 w-3" />
            Buy Zone
          </Badge>
        );
      case 'sell':
        return (
          <Badge className="gap-1 bg-red-500/20 text-red-400 border-red-500/30">
            <ArrowDownCircle className="h-3 w-3" />
            Sell Zone
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <CircleDot className="h-3 w-3" />
            Neutral
          </Badge>
        );
    }
  };

  const getFibLevelColor = (level: number): string => {
    if (level === 0 || level === 1) return 'text-muted-foreground';
    if (level === 0.382 || level === 0.618) return 'text-amber-400';
    if (level === 0.5) return 'text-cyan-400';
    return 'text-foreground/70';
  };

  const formatPrice = (price: number): string => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  return (
    <Card className={cn(
      "flex flex-col h-full overflow-hidden",
      "bg-card/40 backdrop-blur-md border-primary/20",
      className
    )}>
      <div className="flex items-center justify-between p-3 border-b border-border/50 widget-drag-handle cursor-move">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-amber-400" />
          <span className="font-semibold text-sm">Fibonacci Retracement</span>
          <Badge variant="outline" className="text-xs font-mono">
            {selectedSymbol}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-fib-config">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card/95 backdrop-blur-md border-primary/30">
              <DialogHeader>
                <DialogTitle>Fibonacci Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Timeframe</Label>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger data-testid="select-fib-timeframe">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEFRAME_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Lookback Period</Label>
                  <Select value={lookback} onValueChange={setLookback}>
                    <SelectTrigger data-testid="select-fib-lookback">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOOKBACK_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {error}
          </div>
        ) : fibData ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {fibData.trend === 'uptrend' ? (
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
                <span className="text-sm font-medium capitalize">{fibData.trend}</span>
              </div>
              {getSignalBadge(fibData.signal)}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-background/30">
                <div className="text-muted-foreground">Swing High</div>
                <div className="font-mono text-emerald-400">${formatPrice(fibData.high)}</div>
              </div>
              <div className="p-2 rounded bg-background/30">
                <div className="text-muted-foreground">Swing Low</div>
                <div className="font-mono text-red-400">${formatPrice(fibData.low)}</div>
              </div>
            </div>

            <div className="p-2 rounded bg-background/30">
              <div className="text-xs text-muted-foreground mb-1">Current Price</div>
              <div className="font-mono text-lg">${formatPrice(fibData.currentPrice)}</div>
              {fibData.nearestLevel && (
                <div className="text-xs text-muted-foreground mt-1">
                  Near {fibData.nearestLevel.label} level
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground mb-2">Retracement Levels</div>
              {fibData.levels.map((level, idx) => {
                const isNearCurrent = fibData.nearestLevel?.level === level.level;
                const priceDistance = ((level.price - fibData.currentPrice) / fibData.currentPrice) * 100;
                
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center justify-between p-2 rounded text-xs",
                      isNearCurrent ? "bg-primary/20 border border-primary/30" : "bg-background/20"
                    )}
                    data-testid={`fib-level-${level.label}`}
                  >
                    <div className="flex items-center gap-2">
                      <Target className={cn("h-3 w-3", getFibLevelColor(level.level))} />
                      <span className={cn("font-medium", getFibLevelColor(level.level))}>
                        {level.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono">${formatPrice(level.price)}</span>
                      <span className={cn(
                        "font-mono text-xs",
                        priceDistance > 0 ? "text-emerald-400" : "text-red-400"
                      )}>
                        {priceDistance > 0 ? '+' : ''}{priceDistance.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No data available
          </div>
        )}
      </div>
    </Card>
  );
}
