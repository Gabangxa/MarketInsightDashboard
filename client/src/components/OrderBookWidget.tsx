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
  viewMode?: "both" | "bids" | "asks";
}

// Percentage increment levels for depth buckets
const PERCENTAGE_LEVELS = [
  { value: "0.1", label: "0.1%" },
  { value: "0.2", label: "0.2%" },
  { value: "0.5", label: "0.5%" },
  { value: "1.0", label: "1.0%" },
];

const BUCKET_COUNT = 10; // Fixed 10 levels each side

interface DepthBucket {
  price: number;
  size: number;
  total: number;
  percentage: number; // Distance from mid in %
}

// Create percentage-based depth buckets
function createDepthBuckets(
  orders: OrderBookEntry[],
  midPrice: number,
  percentIncrement: number,
  type: 'bid' | 'ask'
): DepthBucket[] {
  // Create 10 fixed buckets based on percentage from mid
  const buckets: DepthBucket[] = [];
  
  for (let i = 1; i <= BUCKET_COUNT; i++) {
    const pct = i * percentIncrement / 100; // Convert to decimal
    const price = type === 'ask' 
      ? midPrice * (1 + pct)  // Asks go up
      : midPrice * (1 - pct); // Bids go down
    
    buckets.push({
      price,
      size: 0,
      total: 0,
      percentage: i * percentIncrement
    });
  }
  
  // Map incoming orders to nearest bucket
  orders.forEach(order => {
    const orderPct = Math.abs((order.price - midPrice) / midPrice) * 100;
    
    // Find the bucket this order belongs to
    const bucketIndex = Math.min(
      Math.floor(orderPct / percentIncrement),
      BUCKET_COUNT - 1
    );
    
    if (bucketIndex >= 0 && bucketIndex < BUCKET_COUNT) {
      buckets[bucketIndex].size += order.size;
    }
  });
  
  // Calculate running totals
  let runningTotal = 0;
  buckets.forEach(bucket => {
    runningTotal += bucket.price * bucket.size;
    bucket.total = runningTotal;
  });
  
  return buckets;
}

export default function OrderBookWidget({ data, onConfigure, viewMode = "both" }: OrderBookWidgetProps) {
  const [percentIncrement, setPercentIncrement] = useState("0.1");
  const incrementValue = parseFloat(percentIncrement);

  // Calculate mid price and create percentage-based buckets  
  // CSS transitions handle visual smoothness, no throttling needed
  const { displayAsks, displayBids, maxTotal, midPrice } = useMemo(() => {
    // Calculate mid price from best bid and ask
    const bestBid = data.bids[0]?.price || 0;
    const bestAsk = data.asks[0]?.price || 0;
    const mid = (bestBid + bestAsk) / 2;
    
    if (!mid || !bestBid || !bestAsk) {
      return {
        displayAsks: [],
        displayBids: [],
        maxTotal: 1,
        midPrice: 0
      };
    }
    
    // Create fixed percentage buckets
    const askBuckets = createDepthBuckets(data.asks, mid, incrementValue, 'ask');
    const bidBuckets = createDepthBuckets(data.bids, mid, incrementValue, 'bid');
    
    // Reverse asks for display (furthest from mid at top, closest at bottom)
    const asksReversed = [...askBuckets].reverse();
    
    // Recalculate running totals in display order (top to bottom)
    let askRunningTotal = 0;
    asksReversed.forEach(ask => {
      askRunningTotal += ask.price * ask.size;
      ask.total = askRunningTotal;
    });
    
    const max = Math.max(
      ...asksReversed.map(a => a.total),
      ...bidBuckets.map(b => b.total),
      1
    );
    
    return {
      displayAsks: asksReversed,
      displayBids: bidBuckets,
      maxTotal: max,
      midPrice: mid
    };
  }, [data.asks, data.bids, incrementValue]);

  return (
    <Card className="h-full p-4 flex flex-col overflow-hidden" data-testid="widget-order-book">
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
          <Select value={percentIncrement} onValueChange={setPercentIncrement}>
            <SelectTrigger className="h-6 w-20 text-xs" data-testid="select-precision">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERCENTAGE_LEVELS.map((level) => (
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
            className="h-6 w-6 relative z-10 pointer-events-auto"
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

        {/* Asks (Sells) - Red, furthest from mid at top */}
        {(viewMode === "both" || viewMode === "asks") && (
          <div className="space-y-1">
            {displayAsks.length > 0 ? (
              displayAsks.map((ask, idx) => (
                <div
                  key={`ask-${ask.percentage}`}
                  className="relative grid grid-cols-3 text-xs font-mono py-1.5"
                  data-testid={`orderbook-ask-${ask.percentage}`}
                >
                  <div
                    className="absolute inset-0 bg-negative/20 transition-all duration-300 ease-out"
                    style={{ width: `${(ask.total / maxTotal) * 100}%` }}
                  />
                  <span className="relative text-negative font-medium">
                    {ask.price.toFixed(2)}
                  </span>
                  <span className="relative text-right">
                    {ask.size > 0 ? ask.size.toFixed(4) : '-'}
                  </span>
                  <span className="relative text-right text-muted-foreground">
                    {ask.total > 0 ? ask.total.toFixed(2) : '-'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground text-center py-2">No asks</div>
            )}
          </div>
        )}

        {/* Spread - Only show when both sides are visible */}
        {viewMode === "both" && (
          <div className="py-2 border-y border-border">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Spread</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium">${data.spread.toFixed(2)}</span>
                <span className="text-muted-foreground">({data.spreadPercent.toFixed(3)}%)</span>
              </div>
            </div>
          </div>
        )}

        {/* Bids (Buys) - Green, closest to mid at top */}
        {(viewMode === "both" || viewMode === "bids") && (
          <div className="space-y-1">
            {displayBids.length > 0 ? (
              displayBids.map((bid, idx) => (
                <div
                  key={`bid-${bid.percentage}`}
                  className="relative grid grid-cols-3 text-xs font-mono py-1.5"
                  data-testid={`orderbook-bid-${bid.percentage}`}
                >
                  <div
                    className="absolute inset-0 bg-positive/20 transition-all duration-300 ease-out"
                    style={{ width: `${(bid.total / maxTotal) * 100}%` }}
                  />
                  <span className="relative text-positive font-medium">
                    {bid.price.toFixed(2)}
                  </span>
                  <span className="relative text-right">
                    {bid.size > 0 ? bid.size.toFixed(4) : '-'}
                  </span>
                  <span className="relative text-right text-muted-foreground">
                    {bid.total > 0 ? bid.total.toFixed(2) : '-'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground text-center py-2">No bids</div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
