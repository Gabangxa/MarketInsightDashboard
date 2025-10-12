import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

// Price grouping levels
const PRECISION_LEVELS = [
  { value: "0.01", label: "$0.01" },
  { value: "0.10", label: "$0.10" },
  { value: "1.00", label: "$1.00" },
  { value: "10.00", label: "$10.00" },
];

// Simple aggregation without fixed grid
function aggregateOrders(
  orders: OrderBookEntry[],
  precision: number,
  type: 'bid' | 'ask'
): Array<{ price: number; size: number; total: number }> {
  const priceMap = new Map<number, number>();
  
  // Group by rounded price
  orders.forEach(order => {
    const roundedPrice = type === 'bid'
      ? Math.floor(order.price / precision) * precision
      : Math.ceil(order.price / precision) * precision;
    
    priceMap.set(roundedPrice, (priceMap.get(roundedPrice) || 0) + order.size);
  });
  
  // Convert to array and sort
  const sorted = Array.from(priceMap.entries())
    .map(([price, size]) => ({ price, size, total: 0 }))
    .sort((a, b) => type === 'bid' ? b.price - a.price : a.price - b.price);
  
  // Calculate running totals
  let runningTotal = 0;
  sorted.forEach(item => {
    runningTotal += item.price * item.size;
    item.total = runningTotal;
  });
  
  return sorted;
}

export default function OrderBookWidget({ data, onConfigure }: OrderBookWidgetProps) {
  const [precision, setPrecision] = useState("0.10");
  const precisionValue = parseFloat(precision);

  // Aggregate orders with stable keys
  const { displayAsks, displayBids, maxTotal } = useMemo(() => {
    const asks = aggregateOrders(data.asks, precisionValue, 'ask').slice(0, 10);
    const bids = aggregateOrders(data.bids, precisionValue, 'bid').slice(0, 10);
    
    // Reverse asks for display (highest to lowest)
    const asksReversed = [...asks].reverse();
    
    const max = Math.max(
      ...asks.map(a => a.total),
      ...bids.map(b => b.total),
      1
    );
    
    return {
      displayAsks: asksReversed,
      displayBids: bids,
      maxTotal: max
    };
  }, [data.asks, data.bids, precisionValue]);

  return (
    <Card className="p-4" data-testid="widget-order-book">
      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Order Book - {data.symbol}
            </h3>
            {data.exchanges.length > 1 && (
              <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-md font-medium">
                Aggregated
              </span>
            )}
          </div>
          {data.exchanges.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {data.exchanges.map((exchange) => (
                <span
                  key={exchange}
                  className="text-xs px-1.5 py-0.5 bg-accent/50 rounded-md text-accent-foreground"
                >
                  {exchange}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={precision} onValueChange={setPrecision}>
            <SelectTrigger className="h-6 w-20 text-xs" data-testid="select-precision">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRECISION_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </div>

      <div className="space-y-4">
        {/* Column Headers */}
        <div className="grid grid-cols-3 text-xs text-muted-foreground">
          <span>Price (USD)</span>
          <span className="text-right">Size</span>
          <span className="text-right">Total</span>
        </div>

        {/* Asks (Sells) - Red, highest to lowest */}
        <div className="space-y-1">
          {displayAsks.length > 0 ? (
            displayAsks.map((ask) => (
              <div
                key={`ask-${ask.price.toFixed(2)}`}
                className="relative grid grid-cols-3 text-xs font-mono py-1.5"
                data-testid={`orderbook-ask-${ask.price.toFixed(2)}`}
              >
                <div
                  className="absolute inset-0 bg-negative/20"
                  style={{ width: `${(ask.total / maxTotal) * 100}%` }}
                />
                <span className="relative text-negative font-medium">
                  {ask.price.toFixed(2)}
                </span>
                <span className="relative text-right">{ask.size.toFixed(4)}</span>
                <span className="relative text-right text-muted-foreground">
                  {ask.total.toFixed(2)}
                </span>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground text-center py-2">No asks</div>
          )}
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

        {/* Bids (Buys) - Green, highest to lowest */}
        <div className="space-y-1">
          {displayBids.length > 0 ? (
            displayBids.map((bid) => (
              <div
                key={`bid-${bid.price.toFixed(2)}`}
                className="relative grid grid-cols-3 text-xs font-mono py-1.5"
                data-testid={`orderbook-bid-${bid.price.toFixed(2)}`}
              >
                <div
                  className="absolute inset-0 bg-positive/20"
                  style={{ width: `${(bid.total / maxTotal) * 100}%` }}
                />
                <span className="relative text-positive font-medium">
                  {bid.price.toFixed(2)}
                </span>
                <span className="relative text-right">{bid.size.toFixed(4)}</span>
                <span className="relative text-right text-muted-foreground">
                  {bid.total.toFixed(2)}
                </span>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground text-center py-2">No bids</div>
          )}
        </div>
      </div>
    </Card>
  );
}
