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
import { useSymbol } from "@/contexts/SymbolContext";
import { aggregateOrderBook } from "@/lib/marketAggregation";
import type { OrderBookData } from "@shared/types";

export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
  exchange?: string; // only present in split view
}

export interface OrderBookWidgetData {
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  spreadPercent: number;
  exchanges: string[];
}

interface OrderBookWidgetProps {
  orderBooks: Map<string, Map<string, OrderBookData>>;
  onConfigure?: () => void;
  viewMode?: "both" | "bids" | "asks";
}

const PERCENTAGE_LEVELS = [
  { value: "0.1", label: "0.1%" },
  { value: "0.2", label: "0.2%" },
  { value: "0.5", label: "0.5%" },
  { value: "1.0", label: "1.0%" },
];

const MAX_LEVELS = 10;

/** Convert raw [price, size][] tuples into OrderBookEntry[] with running totals. */
function processRaw(
  rawOrders: Array<[number, number]>,
  side: "bid" | "ask"
): OrderBookEntry[] {
  const sorted = [...rawOrders].sort(([a], [b]) => side === "bid" ? b - a : a - b);
  let running = 0;
  return sorted.slice(0, MAX_LEVELS).map(([price, size]) => {
    running += size;
    return { price, size, total: running };
  });
}

/** Derive display data for a single side, from already-processed entries. */
function deriveDisplay(entries: OrderBookEntry[], midPrice: number, maxTotal: number) {
  return entries.map((e) => ({
    ...e,
    barWidth: maxTotal > 0 ? (e.total / maxTotal) * 100 : 0,
    percentage: midPrice > 0 ? Math.abs((e.price - midPrice) / midPrice) * 100 : 0,
  }));
}

export default function OrderBookWidget({
  orderBooks,
  onConfigure,
  viewMode = "both",
}: OrderBookWidgetProps) {
  const { selectedSymbol } = useSymbol();
  const [percentIncrement] = useState("0.1");
  const [selectedExchangeTab, setSelectedExchangeTab] = useState<string>("all");

  // Available exchanges from raw order book data
  const availableExchanges = useMemo(() => {
    const sym = orderBooks.get(selectedSymbol);
    return sym ? Array.from(sym.keys()) : [];
  }, [selectedSymbol, orderBooks]);

  // If previously selected exchange is no longer available, reset to "all"
  const activeTab =
    selectedExchangeTab === "all" || availableExchanges.includes(selectedExchangeTab)
      ? selectedExchangeTab
      : "all";

  // Aggregated data (used for "all" tab)
  const aggregatedData = useMemo(() => {
    const symbolOrderBooks = orderBooks.get(selectedSymbol);
    if (!symbolOrderBooks) return null;
    return aggregateOrderBook(selectedSymbol, symbolOrderBooks);
  }, [selectedSymbol, orderBooks]);

  // Per-exchange raw data (used for named exchange tabs)
  const rawExchangeData = useMemo(() => {
    if (activeTab === "all") return null;
    const raw = orderBooks.get(selectedSymbol)?.get(activeTab);
    if (!raw) return null;
    const bids = processRaw(raw.bids, "bid");
    const asks = processRaw(raw.asks, "ask");
    return { bids, asks, exchange: activeTab };
  }, [activeTab, selectedSymbol, orderBooks]);

  // Unified display computation
  const { displayAsks, displayBids, maxTotal, midPrice, spread, spreadPercent, exchanges } =
    useMemo(() => {
      const empty = {
        displayAsks: [] as ReturnType<typeof deriveDisplay>,
        displayBids: [] as ReturnType<typeof deriveDisplay>,
        maxTotal: 1,
        midPrice: 0,
        spread: 0,
        spreadPercent: 0,
        exchanges: [] as string[],
      };

      if (activeTab === "all") {
        // Use aggregated data
        if (!aggregatedData?.bids?.length || !aggregatedData?.asks?.length) return empty;
        const bestBid = aggregatedData.bids[0].price;
        const bestAsk = aggregatedData.asks[0].price;
        const mid = (bestBid + bestAsk) / 2;
        const sp = bestAsk - bestBid;

        const topBids = aggregatedData.bids.slice(0, MAX_LEVELS);
        const topAsks = aggregatedData.asks.slice(0, MAX_LEVELS);
        let br = 0, ar = 0;
        topBids.forEach((b) => { br += b.size; b.total = br; });
        topAsks.forEach((a) => { ar += a.size; a.total = ar; });

        const max = Math.max(...topAsks.map((a) => a.total), ...topBids.map((b) => b.total), 1);
        return {
          displayAsks: deriveDisplay([...topAsks].reverse(), mid, max),
          displayBids: deriveDisplay(topBids, mid, max),
          maxTotal: max,
          midPrice: mid,
          spread: sp,
          spreadPercent: mid > 0 ? (sp / mid) * 100 : 0,
          exchanges: aggregatedData.exchanges,
        };
      } else {
        // Per-exchange raw data
        if (!rawExchangeData?.bids.length && !rawExchangeData?.asks.length) return empty;
        const bids = rawExchangeData?.bids ?? [];
        const asks = rawExchangeData?.asks ?? [];
        const bestBid = bids[0]?.price ?? 0;
        const bestAsk = asks[0]?.price ?? 0;
        const mid = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : 0;
        const sp = bestAsk - bestBid;
        const max = Math.max(...asks.map((a) => a.total), ...bids.map((b) => b.total), 1);
        return {
          displayAsks: deriveDisplay([...asks].reverse(), mid, max),
          displayBids: deriveDisplay(bids, mid, max),
          maxTotal: max,
          midPrice: mid,
          spread: sp,
          spreadPercent: mid > 0 ? (sp / mid) * 100 : 0,
          exchanges: [activeTab],
        };
      }
    }, [activeTab, aggregatedData, rawExchangeData]);

  const tabs = ["all", ...availableExchanges];

  return (
    <Card className="h-full p-4 flex flex-col overflow-hidden" data-testid="widget-order-book">
      {/* Header */}
      <div className="flex items-start justify-between mb-2 widget-drag-handle cursor-move">
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Order Book — {selectedSymbol}
          </h3>
          {activeTab === "all" && exchanges.length > 1 && (
            <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-md font-medium w-fit">
              Aggregated
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={percentIncrement} onValueChange={() => {}}>
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

      {/* Exchange tabs — only shown when multiple exchanges present */}
      {tabs.length > 1 && (
        <div className="flex gap-1 mb-2 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedExchangeTab(tab)}
              className={`text-xs px-2 py-0.5 rounded-md border transition-colors ${
                activeTab === tab
                  ? "bg-primary/20 text-primary border-primary/30 font-medium"
                  : "bg-accent/30 text-muted-foreground border-border hover:bg-accent/60"
              }`}
              data-testid={`tab-exchange-${tab}`}
            >
              {tab === "all" ? "All" : tab}
            </button>
          ))}
        </div>
      )}

      {/* Column headers */}
      <div className="shrink-0 grid grid-cols-3 text-xs text-muted-foreground font-medium px-2 mb-1">
        <span className="text-left">Price (USD)</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      {/* Order levels */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Asks */}
        {(viewMode === "both" || viewMode === "asks") && (
          <div className="flex-1 overflow-auto space-y-0.5 min-h-0">
            {displayAsks.length > 0 ? (
              displayAsks.map((ask, i) => (
                <div
                  key={`ask-${i}`}
                  className="relative grid grid-cols-3 text-xs font-mono py-1 px-2"
                  data-testid={`orderbook-ask-${i}`}
                >
                  <div
                    className="absolute inset-0 bg-negative/20 transition-all duration-300 ease-out"
                    style={{ width: `${ask.barWidth}%` }}
                  />
                  <span className="relative text-negative font-semibold text-left">
                    {ask.price.toFixed(2)}
                  </span>
                  <span className="relative text-right font-medium">
                    {ask.size > 0 ? ask.size.toFixed(4) : "—"}
                  </span>
                  <span className="relative text-right text-muted-foreground font-medium">
                    {ask.total > 0 ? ask.total.toFixed(2) : "—"}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground text-center py-2">No asks</div>
            )}
          </div>
        )}

        {/* Spread */}
        {viewMode === "both" && (
          <div className="shrink-0 py-1.5 border-y border-border">
            <div className="flex justify-between items-center text-xs px-2">
              <span className="text-muted-foreground">
                Spread{activeTab !== "all" ? ` · ${activeTab}` : ""}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium">${spread.toFixed(2)}</span>
                <span className="text-muted-foreground">({spreadPercent.toFixed(3)}%)</span>
              </div>
            </div>
          </div>
        )}

        {/* Bids */}
        {(viewMode === "both" || viewMode === "bids") && (
          <div className="flex-1 overflow-auto space-y-0.5 min-h-0">
            {displayBids.length > 0 ? (
              displayBids.map((bid, i) => (
                <div
                  key={`bid-${i}`}
                  className="relative grid grid-cols-3 text-xs font-mono py-1 px-2"
                  data-testid={`orderbook-bid-${i}`}
                >
                  <div
                    className="absolute inset-0 bg-positive/20 transition-all duration-300 ease-out"
                    style={{ width: `${bid.barWidth}%` }}
                  />
                  <span className="relative text-positive font-semibold text-left">
                    {bid.price.toFixed(2)}
                  </span>
                  <span className="relative text-right font-medium">
                    {bid.size > 0 ? bid.size.toFixed(4) : "—"}
                  </span>
                  <span className="relative text-right text-muted-foreground font-medium">
                    {bid.total > 0 ? bid.total.toFixed(2) : "—"}
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
