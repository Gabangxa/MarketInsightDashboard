import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
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

function groupBidsByPrice(
  orders: OrderBookEntry[],
  precision: number
): OrderBookEntry[] {
  const grouped = new Map<number, { size: number; total: number }>();

  orders.forEach((order) => {
    // Bids: Round DOWN to precision level
    const groupedPrice = Math.floor(order.price / precision) * precision;
    
    const existing = grouped.get(groupedPrice);
    if (existing) {
      existing.size += order.size;
      existing.total += order.total;
    } else {
      grouped.set(groupedPrice, {
        size: order.size,
        total: order.total,
      });
    }
  });

  // Convert to array, sort descending (best bids first), take top 10
  return Array.from(grouped.entries())
    .map(([price, data]) => ({
      price,
      size: data.size,
      total: data.total,
    }))
    .sort((a, b) => b.price - a.price)
    .slice(0, 10);
}

function groupAsksByPrice(
  orders: OrderBookEntry[],
  precision: number
): OrderBookEntry[] {
  const grouped = new Map<number, { size: number; total: number }>();

  orders.forEach((order) => {
    // Asks: Round UP to precision level
    const groupedPrice = Math.ceil(order.price / precision) * precision;
    
    const existing = grouped.get(groupedPrice);
    if (existing) {
      existing.size += order.size;
      existing.total += order.total;
    } else {
      grouped.set(groupedPrice, {
        size: order.size,
        total: order.total,
      });
    }
  });

  // Convert to array, sort ascending (best asks first), take top 10
  return Array.from(grouped.entries())
    .map(([price, data]) => ({
      price,
      size: data.size,
      total: data.total,
    }))
    .sort((a, b) => a.price - b.price)
    .slice(0, 10);
}

export default function OrderBookWidget({ data, onConfigure }: OrderBookWidgetProps) {
  const [precision, setPrecision] = useState("0.10");
  const precisionValue = parseFloat(precision);

  // Group orders by selected precision
  const groupedAsks = useMemo(() => {
    return groupAsksByPrice(data.asks, precisionValue);
  }, [data.asks, precisionValue]);

  const groupedBids = useMemo(() => {
    return groupBidsByPrice(data.bids, precisionValue);
  }, [data.bids, precisionValue]);

  const maxTotal = Math.max(
    ...groupedBids.map(b => b.total),
    ...groupedAsks.map(a => a.total),
    1 // Prevent division by zero
  );

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

        {/* Asks (Sells) - Red, displayed from highest to lowest (descending) */}
        <div className="space-y-1">
          {groupedAsks.length > 0 ? (
            [...groupedAsks].reverse().map((ask) => (
              <div
                key={`ask-${ask.price}`}
                className="relative grid grid-cols-3 text-xs font-mono py-1.5"
                data-testid={`orderbook-ask-${ask.price}`}
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

        {/* Bids (Buys) - Green */}
        <div className="space-y-1">
          {groupedBids.length > 0 ? (
            groupedBids.map((bid) => (
              <div
                key={`bid-${bid.price}`}
                className="relative grid grid-cols-3 text-xs font-mono py-1.5"
                data-testid={`orderbook-bid-${bid.price}`}
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
