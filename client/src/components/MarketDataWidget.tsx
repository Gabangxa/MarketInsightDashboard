import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MarketData {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  exchanges: string[];
}

interface MarketDataWidgetProps {
  data: MarketData;
  onConfigure?: () => void;
}

export default function MarketDataWidget({ data, onConfigure }: MarketDataWidgetProps) {
  const [flashColor, setFlashColor] = useState<"positive" | "negative" | null>(null);
  
  const isPositive = data.priceChange >= 0;
  
  return (
    <Card className={cn(
      "p-4 relative transition-colors duration-300",
      flashColor === "positive" && "bg-positive/10",
      flashColor === "negative" && "bg-negative/10"
    )} data-testid="widget-market-data">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {data.symbol}
          </h3>
          {data.exchanges.length > 1 && (
            <span className="text-xs px-2 py-0.5 bg-muted rounded-md text-muted-foreground">
              {data.exchanges.length} exchanges
            </span>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onConfigure}
          className="h-6 w-6"
          data-testid="button-configure-market"
        >
          <Settings className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <div className="font-mono text-3xl font-semibold tracking-tight">
            ${data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-positive" />
            ) : (
              <TrendingDown className="h-4 w-4 text-negative" />
            )}
            <span className={cn(
              "text-sm font-medium",
              isPositive ? "text-positive" : "text-negative"
            )}>
              {isPositive ? "+" : ""}{data.priceChangePercent.toFixed(2)}%
            </span>
            <span className="text-sm text-muted-foreground">
              {isPositive ? "+" : ""}{data.priceChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">24h Volume</span>
            <span className="text-sm font-mono font-medium">
              ${(data.volume / 1_000_000).toFixed(2)}M
            </span>
          </div>
        </div>

        {data.exchanges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.exchanges.map((exchange) => (
              <span
                key={exchange}
                className="text-xs px-2 py-0.5 bg-accent/50 rounded-md text-accent-foreground"
              >
                {exchange}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
