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

// Create stable price ladder with fixed levels
function createPriceLadder(
  orders: OrderBookEntry[],
  precision: number,
  type: 'bid' | 'ask',
  count: number = 10
): Array<{ priceLevel: number; size: number; total: number }> {
  if (orders.length === 0) return [];

  // Find the best price (highest bid or lowest ask)
  const bestPrice = type === 'bid' 
    ? Math.max(...orders.map(o => o.price))
    : Math.min(...orders.map(o => o.price));

  // Round to precision to get the starting level
  const startLevel = type === 'bid'
    ? Math.floor(bestPrice / precision) * precision
    : Math.ceil(bestPrice / precision) * precision;

  // Create fixed price levels
  const priceLevels: number[] = [];
  for (let i = 0; i < count; i++) {
    const level = type === 'bid'
      ? startLevel - (i * precision)
      : startLevel + (i * precision);
    priceLevels.push(level);
  }

  // Aggregate orders into fixed price levels
  const levelMap = new Map<number, number>();
  
  orders.forEach(order => {
    // Find which level this order belongs to
    const orderLevel = type === 'bid'
      ? Math.floor(order.price / precision) * precision
      : Math.ceil(order.price / precision) * precision;
    
    // Only include if it matches one of our fixed levels
    if (priceLevels.includes(orderLevel)) {
      levelMap.set(orderLevel, (levelMap.get(orderLevel) || 0) + order.size);
    }
  });

  // Calculate running totals
  let runningTotal = 0;
  return priceLevels.map(priceLevel => {
    const size = levelMap.get(priceLevel) || 0;
    runningTotal += priceLevel * size;
    return {
      priceLevel,
      size,
      total: runningTotal
    };
  }).filter(level => level.size > 0); // Only show levels with volume
}

export default function OrderBookWidget({ data, onConfigure }: OrderBookWidgetProps) {
  const [precision, setPrecision] = useState("0.10");
  const precisionValue = parseFloat(precision);

  // Create stable price ladders
  const { askLadder, bidLadder, maxTotal } = useMemo(() => {
    const asks = createPriceLadder(data.asks, precisionValue, 'ask', 15);
    const bids = createPriceLadder(data.bids, precisionValue, 'bid', 15);
    
    const max = Math.max(
      ...asks.map(a => a.total),
      ...bids.map(b => b.total),
      1
    );

    return {
      askLadder: asks.slice(0, 10).reverse(), // Display highest to lowest
      bidLadder: bids.slice(0, 10), // Already highest to lowest
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
          {askLadder.length > 0 ? (
            askLadder.map((ask, idx) => (
              <div
                key={`ask-${idx}`}
                className="relative grid grid-cols-3 text-xs font-mono py-1.5"
                data-testid={`orderbook-ask-${ask.priceLevel.toFixed(2)}`}
              >
                <div
                  className="absolute inset-0 bg-negative/20"
                  style={{ width: `${(ask.total / maxTotal) * 100}%` }}
                />
                <span className="relative text-negative font-medium">
                  {ask.priceLevel.toFixed(2)}
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
          {bidLadder.length > 0 ? (
            bidLadder.map((bid, idx) => (
              <div
                key={`bid-${idx}`}
                className="relative grid grid-cols-3 text-xs font-mono py-1.5"
                data-testid={`orderbook-bid-${bid.priceLevel.toFixed(2)}`}
              >
                <div
                  className="absolute inset-0 bg-positive/20"
                  style={{ width: `${(bid.total / maxTotal) * 100}%` }}
                />
                <span className="relative text-positive font-medium">
                  {bid.priceLevel.toFixed(2)}
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
