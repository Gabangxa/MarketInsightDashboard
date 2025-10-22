import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Activity,
  BarChart3,
  ArrowUpCircle,
  ArrowDownCircle,
  CircleDot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  calculateAllIndicators,
  convertToPriceData,
  type IndicatorResult,
  type PriceData
} from '@/lib/technicalIndicators';

interface TechnicalIndicatorsWidgetProps {
  marketData?: any[]; // Historical price data
  symbol: string;
  onConfigure?: () => void;
  className?: string;
}

interface IndicatorConfig {
  id: string;
  name: string;
  category: 'trend' | 'momentum' | 'volatility' | 'volume';
  enabled: boolean;
  description: string;
}

const DEFAULT_INDICATORS: IndicatorConfig[] = [
  { id: 'sma20', name: 'SMA 20', category: 'trend', enabled: true, description: '20-period Simple Moving Average' },
  { id: 'ema12', name: 'EMA 12', category: 'trend', enabled: true, description: '12-period Exponential Moving Average' },
  { id: 'rsi', name: 'RSI', category: 'momentum', enabled: true, description: 'Relative Strength Index (14)' },
  { id: 'macd', name: 'MACD', category: 'momentum', enabled: true, description: 'Moving Average Convergence Divergence' },
  { id: 'bollingerBands', name: 'Bollinger Bands', category: 'volatility', enabled: true, description: 'Bollinger Bands (20, 2)' },
  { id: 'stochastic', name: 'Stochastic', category: 'momentum', enabled: false, description: 'Stochastic Oscillator' },
  { id: 'atr', name: 'ATR', category: 'volatility', enabled: false, description: 'Average True Range' },
  { id: 'williamsR', name: 'Williams %R', category: 'momentum', enabled: false, description: 'Williams Percent Range' }
];

function getSignalIcon(signal?: 'buy' | 'sell' | 'hold') {
  switch (signal) {
    case 'buy':
      return <ArrowUpCircle className="h-4 w-4 text-green-500" />;
    case 'sell':
      return <ArrowDownCircle className="h-4 w-4 text-red-500" />;
    default:
      return <CircleDot className="h-4 w-4 text-muted-foreground" />;
  }
}

function getSignalColor(signal?: 'buy' | 'sell' | 'hold') {
  switch (signal) {
    case 'buy':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'sell':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-muted-foreground bg-muted border-border';
  }
}

function formatIndicatorValue(indicator: IndicatorResult): string {
  if (!indicator.lastValue) return 'N/A';
  
  const value = indicator.lastValue.value;
  
  // Special formatting for different indicator types
  if (indicator.name.includes('RSI') || indicator.name.includes('Stoch') || indicator.name.includes('Williams')) {
    return value.toFixed(1);
  }
  
  if (indicator.name.includes('MACD')) {
    return value.toFixed(4);
  }
  
  return value.toFixed(2);
}

function getIndicatorDescription(indicator: IndicatorResult): string {
  if (!indicator.lastValue) return 'No data available';
  
  const { value, signal, metadata } = indicator.lastValue;
  
  if (indicator.name.includes('RSI')) {
    if (value <= 30) return 'Oversold condition - potential buying opportunity';
    if (value >= 70) return 'Overbought condition - potential selling pressure';
    return 'Neutral momentum';
  }
  
  if (indicator.name.includes('MACD')) {
    const histogram = metadata?.histogram || 0;
    if (histogram > 0) return 'Bullish momentum building';
    if (histogram < 0) return 'Bearish momentum building';
    return 'Momentum at equilibrium';
  }
  
  if (indicator.name.includes('Bollinger')) {
    const position = metadata?.position || 50;
    if (position <= 10) return 'Price near lower band - oversold';
    if (position >= 90) return 'Price near upper band - overbought';
    return `Price at ${position.toFixed(0)}% of band range`;
  }
  
  if (indicator.name.includes('Stoch')) {
    if (value <= 20) return 'Oversold - potential upward reversal';
    if (value >= 80) return 'Overbought - potential downward reversal';
    return 'Neutral oscillator reading';
  }
  
  return `Current value: ${formatIndicatorValue(indicator)}`;
}

export default function TechnicalIndicatorsWidget({ 
  marketData = [], 
  symbol,
  onConfigure,
  className 
}: TechnicalIndicatorsWidgetProps) {
  const [indicatorConfigs, setIndicatorConfigs] = useState<IndicatorConfig[]>(DEFAULT_INDICATORS);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Convert market data to required format and calculate indicators
  const indicators = useMemo(() => {
    if (!marketData?.length || marketData.length < 26) {
      return {};
    }

    try {
      // Generate mock OHLC data from market data if needed
      const priceData: PriceData[] = marketData.map((data, index) => {
        const price = parseFloat(data.price || data.close || 0);
        const timestamp = new Date(data.timestamp || Date.now()).getTime();
        
        // Create synthetic OHLC if only price is available
        const volatility = 0.001; // 0.1% volatility
        const randomFactor = (Math.random() - 0.5) * volatility;
        
        return {
          timestamp,
          open: price * (1 + randomFactor),
          high: price * (1 + Math.abs(randomFactor) * 1.5),
          low: price * (1 - Math.abs(randomFactor) * 1.5),
          close: price,
          volume: parseFloat(data.volume || Math.random() * 1000000)
        };
      });

      return calculateAllIndicators(priceData);
    } catch (error) {
      console.error('Error calculating technical indicators:', error);
      return {};
    }
  }, [marketData]);

  // Filter enabled indicators
  const enabledIndicators = indicatorConfigs.filter(config => config.enabled);
  
  // Filter by category
  const filteredIndicators = selectedCategory === 'all' 
    ? enabledIndicators
    : enabledIndicators.filter(config => config.category === selectedCategory);

  const handleToggleIndicator = (indicatorId: string) => {
    setIndicatorConfigs(prev => 
      prev.map(config => 
        config.id === indicatorId 
          ? { ...config, enabled: !config.enabled }
          : config
      )
    );
  };

  const categories = [
    { id: 'all', name: 'All', icon: BarChart3 },
    { id: 'trend', name: 'Trend', icon: TrendingUp },
    { id: 'momentum', name: 'Momentum', icon: Activity },
    { id: 'volatility', name: 'Volatility', icon: AlertTriangle }
  ];

  return (
    <Card className={cn("h-full p-4 flex flex-col overflow-hidden", className)} data-testid="widget-technical-indicators">
      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Technical Indicators - {symbol}
            </h3>
            {Object.keys(indicators).length === 0 && (
              <Badge variant="secondary" className="text-xs">
                Need more data
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {enabledIndicators.length} indicators enabled
          </p>
        </div>
        
        <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
          <DialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 relative z-10 pointer-events-auto"
              data-testid="button-configure-indicators"
            >
              <Settings className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Configure Technical Indicators</DialogTitle>
              <DialogDescription>
                Select which indicators to display on your dashboard
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {categories.slice(1).map(category => {
                const categoryIndicators = DEFAULT_INDICATORS.filter(ind => ind.category === category.id);
                const Icon = category.icon;
                
                return (
                  <div key={category.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <h4 className="text-sm font-medium">{category.name}</h4>
                    </div>
                    <div className="space-y-2 pl-6">
                      {categoryIndicators.map(indicator => (
                        <div key={indicator.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={indicator.id}
                              checked={indicator.enabled}
                              onCheckedChange={() => handleToggleIndicator(indicator.id)}
                            />
                            <div className="grid gap-1.5 leading-none">
                              <label
                                htmlFor={indicator.id}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {indicator.name}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {indicator.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Separator className="mt-3" />
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Filter */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {categories.map(category => {
          const Icon = category.icon;
          const isActive = selectedCategory === category.id;
          const count = category.id === 'all' 
            ? enabledIndicators.length 
            : enabledIndicators.filter(ind => ind.category === category.id).length;
          
          return (
            <Button
              key={category.id}
              size="sm"
              variant={isActive ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.id)}
              className="flex items-center gap-1 text-xs flex-shrink-0"
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
      <div className="flex-1 overflow-auto space-y-3 min-h-0" data-testid="indicators-list">
        {Object.keys(indicators).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Need at least 26 data points</p>
            <p className="text-xs">to calculate technical indicators</p>
          </div>
        ) : filteredIndicators.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No indicators enabled</p>
            <p className="text-xs">in this category</p>
          </div>
        ) : (
          filteredIndicators.map(config => {
            const indicator = indicators[config.id];
            if (!indicator) return null;

            const signal = indicator.lastValue?.signal || 'hold';
            const value = formatIndicatorValue(indicator);
            const description = getIndicatorDescription(indicator);

            return (
              <div
                key={config.id}
                className="p-3 bg-accent/20 rounded-lg border hover:bg-accent/30 transition-colors"
                data-testid={`indicator-${config.id}`}
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
                
                {/* Special visualizations for certain indicators */}
                {config.id === 'rsi' && indicator.lastValue && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Oversold (30)</span>
                      <span>Overbought (70)</span>
                    </div>
                    <Progress value={indicator.lastValue.value} className="h-2" />
                  </div>
                )}
                
                {config.id === 'stochastic' && indicator.lastValue && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>%K: {indicator.lastValue.value.toFixed(1)}</span>
                      <span>%D: {indicator.lastValue.metadata?.d?.toFixed(1) || 'N/A'}</span>
                    </div>
                    <Progress value={indicator.lastValue.value} className="h-2" />
                  </div>
                )}
                
                {config.id === 'macd' && indicator.lastValue?.metadata && (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">MACD:</span>
                      <div className="font-mono">{indicator.lastValue.metadata.macd?.toFixed(4)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Signal:</span>
                      <div className="font-mono">{indicator.lastValue.metadata.signal?.toFixed(4)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Histogram:</span>
                      <div className={cn("font-mono", indicator.lastValue.metadata.histogram > 0 ? 'text-green-600' : 'text-red-600')}>
                        {indicator.lastValue.metadata.histogram?.toFixed(4)}
                      </div>
                    </div>
                  </div>
                )}
                
                {config.id === 'bollingerBands' && indicator.lastValue?.metadata && (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Upper:</span>
                      <div className="font-mono">{indicator.lastValue.metadata.upperBand?.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">SMA:</span>
                      <div className="font-mono">{indicator.lastValue.metadata.sma?.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lower:</span>
                      <div className="font-mono">{indicator.lastValue.metadata.lowerBand?.toFixed(2)}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}