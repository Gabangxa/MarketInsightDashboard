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

// Create depth buckets using adaptive percentage-based bucketing
function createDepthBuckets(
  orders: OrderBookEntry[],
  midPrice: number,
  percentIncrement: number,
  type: 'bid' | 'ask'
): DepthBucket[] {
  if (orders.length === 0 || !midPrice) {
    return [];
  }
  
  // Calculate the actual price range of orders
  const prices = orders.map(o => o.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const actualSpreadPct = Math.abs((maxPrice - minPrice) / midPrice) * 100;
  
  // If orders span less than the configured range, use actual spread
  // Otherwise use percentage increments
  const useActualSpread = actualSpreadPct < (percentIncrement * BUCKET_COUNT);
  
  if (useActualSpread) {
    // Orders are tightly clustered - distribute them across buckets based on actual prices
    const priceStep = (maxPrice - minPrice) / BUCKET_COUNT;
    console.log(`[OrderBook ${type}] Adaptive mode: ${orders.length} orders, spread ${actualSpreadPct.toFixed(4)}%, step $${priceStep.toFixed(2)}`);
    const buckets: DepthBucket[] = [];
    
    for (let i = 0; i < BUCKET_COUNT; i++) {
      const bucketMin = type === 'ask' ? minPrice + (i * priceStep) : maxPrice - ((i + 1) * priceStep);
      const bucketMax = type === 'ask' ? minPrice + ((i + 1) * priceStep) : maxPrice - (i * priceStep);
      
      // Find orders in this bucket's price range
      // For asks: include >= min AND <= max (use <= for last bucket to include maxPrice)
      // For bids: include >= min AND <= max (use >= for last bucket to include minPrice)
      const bucketOrders = orders.filter(o => {
        return type === 'ask' 
          ? (o.price >= bucketMin && (i === BUCKET_COUNT - 1 ? o.price <= bucketMax : o.price < bucketMax))
          : (o.price <= bucketMax && (i === BUCKET_COUNT - 1 ? o.price >= bucketMin : o.price > bucketMin));
      });
      
      if (bucketOrders.length > 0) {
        console.log(`[OrderBook ${type}] Bucket ${i}: ${bucketOrders.length} orders, range $${bucketMin.toFixed(2)}-$${bucketMax.toFixed(2)}`);
      }
      
      if (bucketOrders.length === 0) continue;
      
      const totalSize = bucketOrders.reduce((sum, order) => sum + order.size, 0);
      const displayPrice = type === 'ask' ? bucketMax : bucketMin;
      const percentFromMid = Math.abs((displayPrice - midPrice) / midPrice) * 100;
      
      buckets.push({
        price: displayPrice,
        size: totalSize,
        total: 0,
        percentage: percentFromMid
      });
    }
    
    // Calculate running totals
    let runningTotal = 0;
    buckets.forEach(bucket => {
      runningTotal += bucket.size;
      bucket.total = runningTotal;
    });
    
    return buckets;
  } else {
    // Orders span wide range - use traditional percentage buckets
    const buckets: DepthBucket[] = [];
    
    for (let i = 1; i <= BUCKET_COUNT; i++) {
      const pct = i * percentIncrement / 100;
      const bucketPrice = type === 'ask' ? midPrice * (1 + pct) : midPrice * (1 - pct);
      const prevPct = (i - 1) * percentIncrement / 100;
      const prevPrice = type === 'ask' ? midPrice * (1 + prevPct) : midPrice * (1 - prevPct);
      
      // Find orders in this percentage range
      const bucketOrders = orders.filter(o => {
        return type === 'ask'
          ? (o.price > prevPrice && o.price <= bucketPrice)
          : (o.price < prevPrice && o.price >= bucketPrice);
      });
      
      if (bucketOrders.length === 0) continue;
      
      const totalSize = bucketOrders.reduce((sum, order) => sum + order.size, 0);
      
      buckets.push({
        price: bucketPrice,
        size: totalSize,
        total: 0,
        percentage: i * percentIncrement
      });
    }
    
    // Calculate running totals
    let runningTotal = 0;
    buckets.forEach(bucket => {
      runningTotal += bucket.size;
      bucket.total = runningTotal;
    });
    
    return buckets;
  }
}

export default function OrderBookWidget({ data, onConfigure, viewMode = "both" }: OrderBookWidgetProps) {
  const [percentIncrement, setPercentIncrement] = useState("0.1");
  const incrementValue = parseFloat(percentIncrement);

  // Simplified and more reliable order book processing
  const { displayAsks, displayBids, maxTotal, midPrice, spread, spreadPercent } = useMemo(() => {
    console.log(`[OrderBookWidget] Processing order book data:`, {
      symbol: data.symbol,
      bidsCount: data.bids?.length || 0,
      asksCount: data.asks?.length || 0,
      viewMode
    });

    // Ensure we have valid data
    if (!data.bids?.length || !data.asks?.length) {
      console.log(`[OrderBookWidget] Insufficient data - bids: ${data.bids?.length}, asks: ${data.asks?.length}`);
      return {
        displayAsks: [],
        displayBids: [],
        maxTotal: 1,
        midPrice: 0,
        spread: 0,
        spreadPercent: 0
      };
    }

    // Calculate mid price from best bid and ask
    const bestBid = data.bids[0]?.price || 0;
    const bestAsk = data.asks[0]?.price || 0;
    const mid = (bestBid + bestAsk) / 2;
    const currentSpread = bestAsk - bestBid;
    const currentSpreadPercent = mid > 0 ? (currentSpread / mid) * 100 : 0;
    
    console.log(`[OrderBookWidget] Price info:`, {
      bestBid,
      bestAsk,
      mid,
      spread: currentSpread,
      spreadPercent: currentSpreadPercent
    });

    if (!mid || !bestBid || !bestAsk) {
      return {
        displayAsks: [],
        displayBids: [],
        maxTotal: 1,
        midPrice: 0,
        spread: currentSpread,
        spreadPercent: currentSpreadPercent
      };
    }
    
    // Simplified approach: Take the top N levels directly from the order book
    // This ensures both sides are always shown when data is available
    const MAX_LEVELS = 10;
    
    // Process asks (sorted ascending, take first N levels)
    const topAsks = data.asks.slice(0, MAX_LEVELS).map(ask => ({
      price: ask.price,
      size: ask.size,
      total: ask.total || ask.size, // Use provided total or fallback to size
      percentage: ((ask.price - mid) / mid) * 100
    }));

    // Process bids (sorted descending, take first N levels)  
    const topBids = data.bids.slice(0, MAX_LEVELS).map(bid => ({
      price: bid.price,
      size: bid.size,
      total: bid.total || bid.size, // Use provided total or fallback to size
      percentage: ((mid - bid.price) / mid) * 100
    }));

    // Calculate running totals if not provided
    let askRunningTotal = 0;
    topAsks.forEach(ask => {
      askRunningTotal += ask.size;
      ask.total = askRunningTotal;
    });

    let bidRunningTotal = 0;
    topBids.forEach(bid => {
      bidRunningTotal += bid.size;
      bid.total = bidRunningTotal;
    });

    // Reverse asks for display (highest price at top)
    const asksForDisplay = [...topAsks].reverse();
    
    const max = Math.max(
      ...asksForDisplay.map(a => a.total),
      ...topBids.map(b => b.total),
      1
    );
    
    console.log(`[OrderBookWidget] Processed data:`, {
      asksForDisplay: asksForDisplay.length,
      topBids: topBids.length,
      maxTotal: max,
      midPrice: mid
    });
    
    return {
      displayAsks: asksForDisplay,
      displayBids: topBids,
      maxTotal: max,
      midPrice: mid,
      spread: currentSpread,
      spreadPercent: currentSpreadPercent
    };
  }, [data.asks, data.bids, data.symbol, viewMode]);

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
        <div className="grid grid-cols-3 text-xs text-muted-foreground font-medium px-2">
          <span className="text-left">Price (USD)</span>
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
                  className="relative grid grid-cols-3 text-xs font-mono py-1 px-2"
                  data-testid={`orderbook-ask-${ask.percentage}`}
                >
                  <div
                    className="absolute inset-0 bg-negative/20 transition-all duration-300 ease-out"
                    style={{ width: `${(ask.total / maxTotal) * 100}%` }}
                  />
                  <span className="relative text-negative font-semibold text-left">
                    {ask.price.toFixed(2)}
                  </span>
                  <span className="relative text-right font-medium">
                    {ask.size > 0 ? ask.size.toFixed(4) : '-'}
                  </span>
                  <span className="relative text-right text-muted-foreground font-medium">
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
                <span className="font-mono font-medium">${spread.toFixed(2)}</span>
                <span className="text-muted-foreground">({spreadPercent.toFixed(3)}%)</span>
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
                  className="relative grid grid-cols-3 text-xs font-mono py-1 px-2"
                  data-testid={`orderbook-bid-${bid.percentage}`}
                >
                  <div
                    className="absolute inset-0 bg-positive/20 transition-all duration-300 ease-out"
                    style={{ width: `${(bid.total / maxTotal) * 100}%` }}
                  />
                  <span className="relative text-positive font-semibold text-left">
                    {bid.price.toFixed(2)}
                  </span>
                  <span className="relative text-right font-medium">
                    {bid.size > 0 ? bid.size.toFixed(4) : '-'}
                  </span>
                  <span className="relative text-right text-muted-foreground font-medium">
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
