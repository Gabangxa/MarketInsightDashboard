import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface MarketDataPoint {
  timestamp: number;
  price: number;
  volume: number;
}

interface TechnicalIndicatorsWidgetProps {
  marketData: MarketDataPoint[];
  symbol: string;
}

export default function TechnicalIndicatorsWidget({ marketData, symbol }: TechnicalIndicatorsWidgetProps) {
  // Calculate simple moving averages
  const calculateSMA = (data: MarketDataPoint[], period: number) => {
    if (data.length < period) return null;
    const sum = data.slice(-period).reduce((acc, d) => acc + d.price, 0);
    return sum / period;
  };

  // Calculate RSI
  const calculateRSI = (data: MarketDataPoint[], period: number = 14) => {
    if (data.length < period + 1) return null;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = data.length - period; i < data.length; i++) {
      const change = data[i].price - data[i - 1].price;
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  const sma20 = calculateSMA(marketData, 20);
  const sma50 = calculateSMA(marketData, 50);
  const rsi = calculateRSI(marketData);
  
  const currentPrice = marketData.length > 0 ? marketData[marketData.length - 1].price : 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Technical Indicators - {symbol}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto space-y-4">
        {/* Moving Averages */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Moving Averages</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-md bg-muted/50">
              <div className="text-xs text-muted-foreground">SMA 20</div>
              <div className="text-lg font-semibold">
                {sma20 ? `$${sma20.toFixed(2)}` : 'N/A'}
              </div>
              {sma20 && currentPrice && (
                <div className={`text-xs flex items-center gap-1 ${currentPrice > sma20 ? 'text-green-500' : 'text-red-500'}`}>
                  {currentPrice > sma20 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {currentPrice > sma20 ? 'Above' : 'Below'}
                </div>
              )}
            </div>
            <div className="p-3 rounded-md bg-muted/50">
              <div className="text-xs text-muted-foreground">SMA 50</div>
              <div className="text-lg font-semibold">
                {sma50 ? `$${sma50.toFixed(2)}` : 'N/A'}
              </div>
              {sma50 && currentPrice && (
                <div className={`text-xs flex items-center gap-1 ${currentPrice > sma50 ? 'text-green-500' : 'text-red-500'}`}>
                  {currentPrice > sma50 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {currentPrice > sma50 ? 'Above' : 'Below'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RSI */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Relative Strength Index</h3>
          <div className="p-3 rounded-md bg-muted/50">
            <div className="text-xs text-muted-foreground mb-2">RSI (14)</div>
            <div className="text-2xl font-semibold">
              {rsi ? rsi.toFixed(2) : 'N/A'}
            </div>
            {rsi && (
              <>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      rsi > 70 ? 'bg-red-500' : 
                      rsi < 30 ? 'bg-green-500' : 
                      'bg-blue-500'
                    }`}
                    style={{ width: `${rsi}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral'}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Trend Signal */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Trend Signal</h3>
          <div className="p-3 rounded-md bg-muted/50">
            {sma20 && sma50 ? (
              <div className={`flex items-center gap-2 ${sma20 > sma50 ? 'text-green-500' : 'text-red-500'}`}>
                {sma20 > sma50 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                <span className="font-semibold">
                  {sma20 > sma50 ? 'Bullish' : 'Bearish'}
                </span>
                <span className="text-sm text-muted-foreground ml-auto">
                  SMA 20 {sma20 > sma50 ? '>' : '<'} SMA 50
                </span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Insufficient data</div>
            )}
          </div>
        </div>

        {marketData.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            No market data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
