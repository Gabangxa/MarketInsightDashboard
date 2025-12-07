import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Activity,
  ArrowUpCircle,
  ArrowDownCircle,
  CircleDot,
  Loader2
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
  calculateStochastic,
  type IndicatorResult,
  type PriceData
} from '@/lib/technicalIndicators';
import { fetchHistoricalCandles, MINIMUM_CANDLES_FOR_INDICATORS } from '@/lib/fetchHistoricalCandles';

interface StochasticOscillatorWidgetProps {
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

const K_PERIOD_OPTIONS = [
  { value: '5', label: '5' },
  { value: '9', label: '9' },
  { value: '14', label: '14' },
  { value: '21', label: '21' },
];

const D_PERIOD_OPTIONS = [
  { value: '3', label: '3' },
  { value: '5', label: '5' },
  { value: '9', label: '9' },
];

export default function StochasticOscillatorWidget({
  exchanges = ['bybit', 'okx'],
  className
}: StochasticOscillatorWidgetProps) {
  const { selectedSymbol } = useSymbol();
  const [stochData, setStochData] = useState<IndicatorResult | null>(null);
  const [historicalValues, setHistoricalValues] = useState<{ k: number; d: number; timestamp: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState('1h');
  const [period, setPeriod] = useState('24h');
  const [kPeriod, setKPeriod] = useState('14');
  const [dPeriod, setDPeriod] = useState('3');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

        if (candleArray.length < MINIMUM_CANDLES_FOR_INDICATORS) {
          setError(`Insufficient data (${candleArray.length} candles)`);
          setStochData(null);
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

        const result = calculateStochastic(priceData, parseInt(kPeriod), parseInt(dPeriod));
        setStochData(result);
        
        const recent = result.values.slice(-50).map(v => ({
          k: v.value,
          d: v.metadata?.d || 0,
          timestamp: v.timestamp
        }));
        setHistoricalValues(recent);
        setLastUpdate(new Date());
      } catch (err) {
        if (isMounted) {
          setError('Failed to fetch price data');
          console.error('Stochastic calculation error:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedSymbol, timeframe, period, kPeriod, dPeriod, exchanges]);

  useEffect(() => {
    if (!canvasRef.current || historicalValues.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 10, right: 10, bottom: 20, left: 35 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.lineWidth = 1;
    
    [20, 50, 80].forEach(level => {
      const y = padding.top + chartHeight - (level / 100) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(150, 150, 150, 0.6)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(level.toString(), padding.left - 5, y + 3);
    });

    ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
    ctx.fillRect(padding.left, padding.top, chartWidth, (20 / 100) * chartHeight);
    
    ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
    const oversoldY = padding.top + chartHeight - (20 / 100) * chartHeight;
    ctx.fillRect(padding.left, oversoldY, chartWidth, (20 / 100) * chartHeight);

    const xStep = chartWidth / (historicalValues.length - 1);

    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    historicalValues.forEach((point, i) => {
      const x = padding.left + i * xStep;
      const y = padding.top + chartHeight - (point.k / 100) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 2]);
    historicalValues.forEach((point, i) => {
      const x = padding.left + i * xStep;
      const y = padding.top + chartHeight - (point.d / 100) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    const lastPoint = historicalValues[historicalValues.length - 1];
    if (lastPoint) {
      const lastX = padding.left + (historicalValues.length - 1) * xStep;
      const lastKY = padding.top + chartHeight - (lastPoint.k / 100) * chartHeight;
      
      ctx.beginPath();
      ctx.fillStyle = '#3b82f6';
      ctx.arc(lastX, lastKY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

  }, [historicalValues]);

  const getSignalBadge = (signal?: 'buy' | 'sell' | 'hold') => {
    switch (signal) {
      case 'buy':
        return (
          <Badge className="gap-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <ArrowUpCircle className="h-3 w-3" />
            Oversold
          </Badge>
        );
      case 'sell':
        return (
          <Badge className="gap-1 bg-red-500/20 text-red-400 border-red-500/30">
            <ArrowDownCircle className="h-3 w-3" />
            Overbought
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

  const getZoneStatus = (k: number, d: number): { zone: string; color: string } => {
    if (k <= 20 && d <= 20) return { zone: 'Oversold Zone', color: 'text-emerald-400' };
    if (k >= 80 && d >= 80) return { zone: 'Overbought Zone', color: 'text-red-400' };
    if (k > 50) return { zone: 'Bullish Territory', color: 'text-cyan-400' };
    return { zone: 'Bearish Territory', color: 'text-amber-400' };
  };

  const lastValue = stochData?.lastValue;
  const k = lastValue?.value || 0;
  const d = lastValue?.metadata?.d || 0;
  const zoneStatus = getZoneStatus(k, d);

  return (
    <Card className={cn(
      "flex flex-col h-full overflow-hidden",
      "bg-card/40 backdrop-blur-md border-primary/20",
      className
    )}>
      <div className="flex items-center justify-between p-3 border-b border-border/50 widget-drag-handle cursor-move">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-400" />
          <span className="font-semibold text-sm">Stochastic Oscillator</span>
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
              <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-stoch-config">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card/95 backdrop-blur-md border-primary/30">
              <DialogHeader>
                <DialogTitle>Stochastic Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Timeframe</Label>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger data-testid="select-stoch-timeframe">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>%K Period</Label>
                    <Select value={kPeriod} onValueChange={setKPeriod}>
                      <SelectTrigger data-testid="select-stoch-k">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {K_PERIOD_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>%D Period</Label>
                    <Select value={dPeriod} onValueChange={setDPeriod}>
                      <SelectTrigger data-testid="select-stoch-d">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {D_PERIOD_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-3 flex flex-col gap-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {error}
          </div>
        ) : stochData?.lastValue ? (
          <>
            <div className="flex items-center justify-between">
              <div className={cn("text-sm font-medium", zoneStatus.color)}>
                {zoneStatus.zone}
              </div>
              {getSignalBadge(lastValue?.signal)}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-background/30">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  %K (Fast)
                </div>
                <div className="font-mono text-lg text-blue-400">{k.toFixed(2)}</div>
              </div>
              <div className="p-2 rounded bg-background/30">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  %D (Slow)
                </div>
                <div className="font-mono text-lg text-amber-400">{d.toFixed(2)}</div>
              </div>
            </div>

            <div className="flex-1 min-h-[120px] relative">
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ display: 'block' }}
                data-testid="stoch-chart"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Stoch({kPeriod},{dPeriod})</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-blue-500" />
                  <span>%K</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-amber-500 border-dashed" style={{ borderTopWidth: 1, borderColor: '#f59e0b' }} />
                  <span>%D</span>
                </div>
              </div>
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
