import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

export interface OrderBookData {
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  spreadPercent: number;
  exchanges: string[];
}

interface OrderBookWidgetProps {
  data: OrderBookData;
  onConfigure?: () => void;
}

export default function OrderBookWidget({ data, onConfigure }: OrderBookWidgetProps) {
  const maxTotal = Math.max(
    ...data.bids.map(b => b.total),
    ...data.asks.map(a => a.total)
  );

  return (
    <Card className="p-4" data-testid="widget-order-book">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Order Book - {data.symbol}
          </h3>
          {data.exchanges.length > 1 && (
            <span className="text-xs px-2 py-0.5 bg-muted rounded-md text-muted-foreground">
              Aggregated
            </span>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onConfigure}
          className="h-6 w-6"
          data-testid="button-configure-orderbook"
        >
          <Settings className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Asks (Sells) */}
        <div className="space-y-1">
          {[...data.asks].reverse().map((ask, idx) => (
            <div
              key={`ask-${idx}`}
              className="relative grid grid-cols-3 text-xs font-mono py-1.5"
              data-testid={`orderbook-ask-${idx}`}
            >
              <div
                className="absolute inset-0 bg-negative/20"
                style={{ width: `${(ask.total / maxTotal) * 100}%` }}
              />
              <span className="relative text-negative font-medium">{ask.price.toFixed(2)}</span>
              <span className="relative text-right">{ask.size.toFixed(4)}</span>
              <span className="relative text-right text-muted-foreground">{ask.total.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Spread */}
        <div className="py-2 border-y border-border">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Spread</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium">${data.spread.toFixed(2)}</span>
              <span className="text-muted-foreground">({data.spreadPercent.toFixed(3)}%)</span>
            </div>
          </div>
        </div>

        {/* Bids (Buys) */}
        <div className="space-y-1">
          {data.bids.map((bid, idx) => (
            <div
              key={`bid-${idx}`}
              className="relative grid grid-cols-3 text-xs font-mono py-1.5"
              data-testid={`orderbook-bid-${idx}`}
            >
              <div
                className="absolute inset-0 bg-positive/20"
                style={{ width: `${(bid.total / maxTotal) * 100}%` }}
              />
              <span className="relative text-positive font-medium">{bid.price.toFixed(2)}</span>
              <span className="relative text-right">{bid.size.toFixed(4)}</span>
              <span className="relative text-right text-muted-foreground">{bid.total.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-3 text-xs text-muted-foreground border-t border-border pt-2">
          <span>Price (USD)</span>
          <span className="text-right">Size</span>
          <span className="text-right">Total</span>
        </div>
      </div>
    </Card>
  );
}
