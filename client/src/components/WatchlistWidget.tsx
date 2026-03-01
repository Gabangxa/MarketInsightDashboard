import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSymbol } from "@/contexts/SymbolContext";
import type { WatchlistToken as WatchlistTokenType } from "@shared/schema";
import type { MarketData } from "@shared/types";

export interface WatchlistToken {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
}

interface WatchlistWidgetProps {
  marketData: Map<string, Map<string, MarketData>>;
  selectedExchanges: string[];
  maxTokens?: number;
}

function fmt(price: number): string {
  if (price === 0) return "—";
  if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function fmtPct(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

// Exchange abbreviations for narrow column headers
const EXCHANGE_ABBR: Record<string, string> = {
  Bybit: "BYB",
  OKX: "OKX",
  Binance: "BIN",
};

export default function WatchlistWidget({
  marketData,
  selectedExchanges,
  maxTokens = 10,
}: WatchlistWidgetProps) {
  const [newSymbol, setNewSymbol] = useState("");
  const { selectedSymbol, setSelectedSymbol } = useSymbol();

  const { data: watchlistTokens = [], isLoading } = useQuery<WatchlistTokenType[]>({
    queryKey: ["/api/watchlist"],
  });

  const addWatchlistMutation = useMutation({
    mutationFn: async (symbol: string) => {
      const res = await apiRequest("POST", "/api/watchlist", {
        symbol,
        exchanges: selectedExchanges,
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] }),
  });

  const removeWatchlistMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/watchlist/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] }),
  });

  // Which exchanges actually have data (for any watched symbol)
  const activeExchanges = useMemo(() => {
    const seen = new Set<string>();
    watchlistTokens.forEach((token) => {
      const symbolData = marketData.get(token.symbol);
      if (symbolData) symbolData.forEach((_, ex) => seen.add(ex));
    });
    // Keep order from selectedExchanges; fall back to whatever arrived
    const ordered = selectedExchanges.filter((ex) => seen.has(ex));
    seen.forEach((ex) => { if (!ordered.includes(ex)) ordered.push(ex); });
    return ordered;
  }, [watchlistTokens, marketData, selectedExchanges]);

  const multiExchange = activeExchanges.length > 1;

  const tokens = useMemo(() => {
    return watchlistTokens.map((token) => {
      const symbolData = marketData.get(token.symbol);
      const perExchange: Record<string, { price: number; change24h: number }> = {};
      activeExchanges.forEach((ex) => {
        const d = symbolData?.get(ex);
        perExchange[ex] = d
          ? { price: d.price, change24h: d.priceChange24h }
          : { price: 0, change24h: 0 };
      });
      return { id: token.id, symbol: token.symbol, perExchange };
    });
  }, [watchlistTokens, marketData, activeExchanges]);

  const handleAddToken = () => {
    if (newSymbol.trim() && tokens.length < maxTokens) {
      addWatchlistMutation.mutate(newSymbol.trim().toUpperCase());
      setNewSymbol("");
    }
  };

  const handleRemoveToken = (symbol: string) => {
    const token = watchlistTokens.find((t) => t.symbol === symbol);
    if (token) removeWatchlistMutation.mutate(token.id);
  };

  if (isLoading) {
    return (
      <Card className="h-full p-4 flex flex-col overflow-hidden" data-testid="widget-watchlist">
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-muted-foreground">Loading watchlist...</div>
        </div>
      </Card>
    );
  }

  // Build grid-template-columns dynamically
  // Single exchange: Symbol | Price | 24h | Del
  // Multi exchange:  Symbol | [Ex1 Price | Ex1 24h] | [Ex2 Price | Ex2 24h] | ... | Del
  const gridCols = multiExchange
    ? `2fr ${activeExchanges.map(() => "1.1fr 0.85fr").join(" ")} auto`
    : "2fr 1.5fr 1fr auto";

  return (
    <Card className="h-full p-4 flex flex-col overflow-hidden" data-testid="widget-watchlist">
      <div className="mb-3">
        <div className="flex items-center justify-between mb-3 widget-drag-handle cursor-move">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Watchlist
          </h3>
          <Badge variant="outline" className="text-xs">
            {tokens.length}/{maxTokens}
          </Badge>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Add symbol (e.g., ETHUSDT)"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddToken()}
            className="h-9 text-sm"
            disabled={tokens.length >= maxTokens}
            data-testid="input-add-token"
          />
          <Button
            size="sm"
            onClick={handleAddToken}
            disabled={!newSymbol.trim() || tokens.length >= maxTokens}
            className="h-9"
            data-testid="button-add-token"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Column headers — dynamic grid */}
      <div
        className="grid pb-2 border-b border-border text-xs text-muted-foreground gap-1"
        style={{ gridTemplateColumns: gridCols }}
      >
        <span>Symbol</span>
        {multiExchange ? (
          activeExchanges.map((ex) => (
            <>
              <span key={`${ex}-price`} className="text-right font-medium" title={ex}>
                {EXCHANGE_ABBR[ex] ?? ex.slice(0, 3).toUpperCase()} $
              </span>
              <span key={`${ex}-chg`} className="text-right">
                24h
              </span>
            </>
          ))
        ) : (
          <>
            <span className="text-right">Price</span>
            <span className="text-right">24h</span>
          </>
        )}
        <span className="w-6" />
      </div>

      {/* Token rows */}
      <div className="flex-1 overflow-auto space-y-1 mt-2 min-h-0" data-testid="watchlist-tokens">
        {tokens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Add tokens to your watchlist
          </div>
        ) : (
          tokens.map((token) => {
            // For single-exchange fallback: grab first available exchange data
            const firstEx = activeExchanges[0];
            const singleData = firstEx ? token.perExchange[firstEx] : { price: 0, change24h: 0 };

            return (
              <div
                key={token.symbol}
                className={cn(
                  "grid gap-1 py-2 px-2 rounded-lg cursor-pointer hover-elevate transition-colors group items-center",
                  selectedSymbol === token.symbol && "bg-primary/10 border border-primary/20"
                )}
                style={{ gridTemplateColumns: gridCols }}
                onClick={() => setSelectedSymbol(token.symbol)}
                data-testid={`watchlist-token-${token.symbol}`}
              >
                {/* Symbol */}
                <span className="text-xs font-medium truncate">{token.symbol}</span>

                {multiExchange ? (
                  activeExchanges.map((ex) => {
                    const d = token.perExchange[ex];
                    const hasData = d.price > 0;
                    return (
                      <>
                        <span
                          key={`${ex}-price`}
                          className="text-xs font-mono font-medium text-right"
                        >
                          {hasData ? `$${fmt(d.price)}` : "—"}
                        </span>
                        <span
                          key={`${ex}-chg`}
                          className={cn(
                            "text-xs font-medium text-right",
                            !hasData
                              ? "text-muted-foreground"
                              : d.change24h >= 0
                              ? "text-positive"
                              : "text-negative"
                          )}
                        >
                          {hasData ? fmtPct(d.change24h) : "—"}
                        </span>
                      </>
                    );
                  })
                ) : (
                  <>
                    <span className="text-xs font-mono font-medium text-right">
                      {singleData.price > 0 ? `$${fmt(singleData.price)}` : "—"}
                    </span>
                    <div
                      className={cn(
                        "flex items-center justify-end gap-1 text-xs font-medium",
                        singleData.change24h >= 0 ? "text-positive" : "text-negative"
                      )}
                    >
                      {singleData.change24h >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>{fmtPct(singleData.change24h)}</span>
                    </div>
                  </>
                )}

                {/* Remove button */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveToken(token.symbol);
                  }}
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid={`button-remove-${token.symbol}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })
        )}
      </div>

      {tokens.length > 0 && (
        <div className="pt-3 border-t border-border mt-2">
          <p className="text-xs text-muted-foreground">Click a token to select it</p>
        </div>
      )}
    </Card>
  );
}
