import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, HelpCircle, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fetchHistoricalCandles, type Candle } from "@/lib/fetchHistoricalCandles";
import { Badge } from "@/components/ui/badge";

interface CorrelationMatrixWidgetProps {
  exchanges: string[];
}

// Default symbols to track
const DEFAULT_SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ADAUSDT"];

// Calculate Pearson correlation coefficient between two price series
function calculatePearsonCorrelation(prices1: number[], prices2: number[]): number {
  if (prices1.length !== prices2.length || prices1.length === 0) {
    return 0;
  }

  const n = prices1.length;
  
  // Calculate means
  const mean1 = prices1.reduce((sum, val) => sum + val, 0) / n;
  const mean2 = prices2.reduce((sum, val) => sum + val, 0) / n;
  
  // Calculate deviations and products
  let numerator = 0;
  let sum1Sq = 0;
  let sum2Sq = 0;
  
  for (let i = 0; i < n; i++) {
    const dev1 = prices1[i] - mean1;
    const dev2 = prices2[i] - mean2;
    numerator += dev1 * dev2;
    sum1Sq += dev1 * dev1;
    sum2Sq += dev2 * dev2;
  }
  
  const denominator = Math.sqrt(sum1Sq * sum2Sq);
  
  if (denominator === 0) {
    return 0;
  }
  
  return numerator / denominator;
}

// Get color for correlation value
function getCorrelationColor(value: number): string {
  if (value >= 0.8) return "bg-green-500/20 text-green-400 border-green-500/30";
  if (value >= 0.5) return "bg-green-500/10 text-green-300 border-green-500/20";
  if (value >= 0.2) return "bg-blue-500/10 text-blue-300 border-blue-500/20";
  if (value >= -0.2) return "bg-gray-500/10 text-gray-300 border-gray-500/20";
  if (value >= -0.5) return "bg-red-500/10 text-red-300 border-red-500/20";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

export default function CorrelationMatrixWidget({ exchanges }: CorrelationMatrixWidgetProps) {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [newSymbol, setNewSymbol] = useState<string>("");
  const [timeframe, setTimeframe] = useState<string>("1h");
  const [period, setPeriod] = useState<string>("1w");
  const [correlationMatrix, setCorrelationMatrix] = useState<Map<string, Map<string, number>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);

  const loadCorrelations = useCallback(async () => {
    setLoading(true);
    
    try {
      // Fetch historical data for all symbols concurrently using Promise.all
      const fetchPromises = symbols.map(symbol =>
        fetchHistoricalCandles(
          symbol,
          timeframe,
          period,
          exchanges.length > 0 ? exchanges : ["bybit", "okx"]
        ).then(candles => ({
          symbol,
          candles
        }))
      );
      
      const results = await Promise.all(fetchPromises);
      
      // Find intersection of timestamps across all symbols for proper alignment
      const timestampSets = results.map(({ candles }) => 
        new Set(Array.from(candles.keys()))
      );
      
      // Get common timestamps that exist for ALL symbols
      const commonTimestamps = timestampSets.reduce((intersection, set) => {
        return new Set(Array.from(intersection).filter(ts => set.has(ts)));
      });
      
      // Sort common timestamps for consistent ordering
      const sortedTimestamps = Array.from(commonTimestamps).sort((a, b) => a - b);
      
      // Extract close prices at common timestamps only
      const priceDataMap = new Map<string, number[]>();
      
      for (const { symbol, candles } of results) {
        const alignedPrices = sortedTimestamps.map(ts => {
          const candle = candles.get(ts);
          return candle ? candle.close : 0; // Should always exist due to intersection
        });
        priceDataMap.set(symbol, alignedPrices);
      }
      
      // Calculate correlation matrix using aligned price series
      const matrix = new Map<string, Map<string, number>>();
      
      for (const symbol1 of symbols) {
        const correlations = new Map<string, number>();
        const prices1 = priceDataMap.get(symbol1) || [];
        
        for (const symbol2 of symbols) {
          const prices2 = priceDataMap.get(symbol2) || [];
          
          if (symbol1 === symbol2) {
            correlations.set(symbol2, 1.0); // Perfect correlation with self
          } else {
            const correlation = calculatePearsonCorrelation(prices1, prices2);
            correlations.set(symbol2, correlation);
          }
        }
        
        matrix.set(symbol1, correlations);
      }
      
      setCorrelationMatrix(matrix);
    } catch (error) {
      console.error("Error calculating correlations:", error);
    } finally {
      setLoading(false);
    }
  }, [symbols, timeframe, period, exchanges]);

  useEffect(() => {
    loadCorrelations();
  }, [loadCorrelations]);

  // Format symbol for display (remove USDT)
  const formatSymbol = (symbol: string) => symbol.replace("USDT", "");

  const addSymbol = () => {
    const formatted = newSymbol.toUpperCase().trim();
    if (formatted && !symbols.includes(formatted)) {
      // Ensure it ends with USDT
      const fullSymbol = formatted.endsWith("USDT") ? formatted : formatted + "USDT";
      setSymbols([...symbols, fullSymbol]);
      setNewSymbol("");
    }
  };

  const removeSymbol = (symbol: string) => {
    // Use functional setState to ensure the guard works with concurrent updates
    setSymbols(prevSymbols => {
      const newSymbols = prevSymbols.filter(s => s !== symbol);
      // Keep at least 2 symbols for correlation
      return newSymbols.length >= 2 ? newSymbols : prevSymbols;
    });
  };

  return (
    <Card className="h-full flex flex-col" data-testid="widget-correlation-matrix">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 widget-drag-handle cursor-move">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold" data-testid="text-correlation-title">
            Correlation Matrix
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  data-testid="button-correlation-help"
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm" data-testid="tooltip-correlation-explanation">
                <p className="font-semibold mb-1">Pearson Correlation Coefficient</p>
                <p className="text-sm text-muted-foreground">
                  Measures linear relationship between asset prices over the selected period.
                  Values range from -1 (perfect negative correlation) to +1 (perfect positive correlation).
                  0 indicates no linear correlation.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Formula: r = Σ[(x-x̄)(y-ȳ)] / √[Σ(x-x̄)² × Σ(y-ȳ)²]
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Dialog open={configOpen} onOpenChange={setConfigOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-configure-correlation">
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" data-testid="dialog-correlation-config">
            <DialogHeader>
              <DialogTitle data-testid="text-correlation-config-title">Configure Correlation Matrix</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label data-testid="label-correlation-symbols">Symbols</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {symbols.map(symbol => (
                    <Badge
                      key={symbol}
                      variant="secondary"
                      className="flex items-center gap-1"
                      data-testid={`badge-symbol-${symbol}`}
                    >
                      {formatSymbol(symbol)}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeSymbol(symbol)}
                        disabled={symbols.length <= 2}
                        title={symbols.length <= 2 ? "Need at least 2 symbols for correlation" : ""}
                        data-testid={`button-remove-symbol-${symbol}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., BTC or BTCUSDT"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSymbol()}
                    data-testid="input-add-symbol"
                  />
                  <Button
                    onClick={addSymbol}
                    variant="outline"
                    size="icon"
                    data-testid="button-add-symbol"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeframe" data-testid="label-correlation-timeframe">Timeframe</Label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger id="timeframe" data-testid="select-correlation-timeframe">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15m" data-testid="option-timeframe-15m">15 minutes</SelectItem>
                    <SelectItem value="1h" data-testid="option-timeframe-1h">1 hour</SelectItem>
                    <SelectItem value="4h" data-testid="option-timeframe-4h">4 hours</SelectItem>
                    <SelectItem value="1d" data-testid="option-timeframe-1d">1 day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="period" data-testid="label-correlation-period">Period</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger id="period" data-testid="select-correlation-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h" data-testid="option-period-24h">24 hours</SelectItem>
                    <SelectItem value="1w" data-testid="option-period-1w">1 week</SelectItem>
                    <SelectItem value="1M" data-testid="option-period-1m">1 month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full" data-testid="status-correlation-loading">
            <p className="text-sm text-muted-foreground">Calculating correlations...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="table-correlation-matrix">
              <thead>
                <tr>
                  <th className="p-1 text-left text-muted-foreground" data-testid="heading-correlation-empty"></th>
                  {symbols.map(symbol => (
                    <th
                      key={symbol}
                      className="p-1 text-center font-semibold"
                      data-testid={`heading-correlation-col-${symbol}`}
                    >
                      {formatSymbol(symbol)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {symbols.map(symbol1 => (
                  <tr key={symbol1}>
                    <td
                      className="p-1 font-semibold"
                      data-testid={`heading-correlation-row-${symbol1}`}
                    >
                      {formatSymbol(symbol1)}
                    </td>
                    {symbols.map(symbol2 => {
                      const value = correlationMatrix.get(symbol1)?.get(symbol2) ?? 0;
                      return (
                        <td key={symbol2} className="p-1">
                          <div
                            className={`
                              rounded px-2 py-1 text-center font-mono border
                              ${getCorrelationColor(value)}
                            `}
                            data-testid={`cell-correlation-${symbol1}-${symbol2}`}
                          >
                            {value.toFixed(2)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
