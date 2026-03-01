import { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FundingRateData } from "@/lib/useMarketWebSocket";

const MAX_SYMBOLS = 10;
const STORAGE_KEY = "funding-rate-tracked-symbols";
// Funding rates are perpetuals-only; always subscribe via Bybit so the
// server-side fundingRateManager gets invoked for any symbol added here.
const SUB_EXCHANGES = ["Bybit"];

interface Props {
  fundingRates: Map<string, Map<string, FundingRateData>>;
  subscribe: (symbol: string, exchanges: string[]) => void;
  unsubscribe: (symbol: string) => void;
}

function formatCountdown(nextFundingTime: number): string {
  const diff = nextFundingTime - Date.now();
  if (!nextFundingTime || diff <= 0) return "soon";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function FundingRateWidget({ fundingRates, subscribe, unsubscribe }: Props) {
  const [trackedSymbols, setTrackedSymbols] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : ["BTCUSDT"];
    } catch {
      return ["BTCUSDT"];
    }
  });
  const [newSymbol, setNewSymbol] = useState("");
  const [, tick] = useState(0);

  // Persist symbol list
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trackedSymbols));
  }, [trackedSymbols]);

  // Subscribe to every tracked symbol; clean up on unmount or list change
  useEffect(() => {
    trackedSymbols.forEach((sym) => subscribe(sym, SUB_EXCHANGES));
    return () => {
      trackedSymbols.forEach((sym) => unsubscribe(sym));
    };
  }, [trackedSymbols, subscribe, unsubscribe]);

  // Drive countdown timer
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  const handleAdd = useCallback(() => {
    const sym = newSymbol.trim().toUpperCase();
    if (!sym || trackedSymbols.includes(sym) || trackedSymbols.length >= MAX_SYMBOLS) return;
    setTrackedSymbols((prev) => [...prev, sym]);
    setNewSymbol("");
  }, [newSymbol, trackedSymbols]);

  const handleRemove = useCallback(
    (sym: string) => {
      setTrackedSymbols((prev) => prev.filter((s) => s !== sym));
      unsubscribe(sym);
    },
    [unsubscribe]
  );

  // Which exchanges currently have data across all tracked symbols
  const activeExchanges = useMemo(() => {
    const seen = new Set<string>();
    trackedSymbols.forEach((sym) => {
      fundingRates.get(sym)?.forEach((_, ex) => seen.add(ex));
    });
    return Array.from(seen).sort();
  }, [trackedSymbols, fundingRates]);

  const multiExchange = activeExchanges.length > 1;

  // Dynamic grid: Symbol | [per-exchange Rate + Next] | Delete
  const gridCols = multiExchange
    ? `2fr ${activeExchanges.map(() => "1fr 1fr").join(" ")} auto`
    : "2fr 1fr 1fr auto";

  return (
    <Card className="h-full p-4 flex flex-col overflow-hidden" data-testid="widget-funding-rate">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 widget-drag-handle cursor-move">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Funding Rates
          </h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {trackedSymbols.length}/{MAX_SYMBOLS}
        </Badge>
      </div>

      {/* Add symbol */}
      <div className="flex gap-2 mb-3">
        <Input
          placeholder="Add symbol (e.g., ETHUSDT)"
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="h-9 text-sm"
          disabled={trackedSymbols.length >= MAX_SYMBOLS}
          data-testid="input-add-funding-symbol"
        />
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!newSymbol.trim() || trackedSymbols.length >= MAX_SYMBOLS}
          className="h-9"
          data-testid="button-add-funding-symbol"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Column headers */}
      <div
        className="grid pb-2 border-b border-border text-xs text-muted-foreground font-medium gap-1"
        style={{ gridTemplateColumns: gridCols }}
      >
        <span>Symbol</span>
        {multiExchange ? (
          activeExchanges.map((ex) => (
            <>
              <span key={`h-${ex}-rate`} className="text-center">
                {ex.slice(0, 3).toUpperCase()} Rate
              </span>
              <span key={`h-${ex}-next`} className="text-right">
                Next
              </span>
            </>
          ))
        ) : (
          <>
            <span className="text-center">Rate</span>
            <span className="text-right">Next funding</span>
          </>
        )}
        <span className="w-6" />
      </div>

      {/* Symbol rows */}
      <div className="flex-1 overflow-auto space-y-0.5 mt-2 min-h-0">
        {trackedSymbols.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Add a symbol to start tracking
          </div>
        ) : (
          trackedSymbols.map((sym) => {
            const symData = fundingRates.get(sym);

            if (multiExchange) {
              return (
                <div
                  key={sym}
                  className="grid gap-1 py-1.5 px-1 rounded hover:bg-muted/50 items-center group"
                  style={{ gridTemplateColumns: gridCols }}
                  data-testid={`funding-row-${sym}`}
                >
                  <span className="text-xs font-medium truncate">{sym}</span>
                  {activeExchanges.map((ex) => {
                    const d = symData?.get(ex);
                    const positive = (d?.fundingRate ?? 0) >= 0;
                    return (
                      <>
                        <span
                          key={`${sym}-${ex}-rate`}
                          className={cn(
                            "text-xs font-mono font-semibold text-center",
                            !d
                              ? "text-muted-foreground"
                              : positive
                              ? "text-green-500"
                              : "text-red-500"
                          )}
                        >
                          {d
                            ? `${positive ? "+" : ""}${d.fundingRatePercent.toFixed(4)}%`
                            : "—"}
                        </span>
                        <span
                          key={`${sym}-${ex}-next`}
                          className="text-xs text-muted-foreground text-right"
                        >
                          {d ? formatCountdown(d.nextFundingTime) : "—"}
                        </span>
                      </>
                    );
                  })}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemove(sym)}
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    data-testid={`button-remove-funding-${sym}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            }

            // Single-exchange layout
            const firstEx = activeExchanges[0];
            const d = firstEx ? symData?.get(firstEx) : undefined;
            const positive = (d?.fundingRate ?? 0) >= 0;
            const hasData = !!d;

            return (
              <div
                key={sym}
                className="grid gap-1 py-1.5 px-1 rounded hover:bg-muted/50 items-center group"
                style={{ gridTemplateColumns: gridCols }}
                data-testid={`funding-row-${sym}`}
              >
                <span className="text-xs font-medium truncate">{sym}</span>
                <span
                  className={cn(
                    "text-xs font-mono font-semibold text-center",
                    !hasData
                      ? "text-muted-foreground"
                      : positive
                      ? "text-green-500"
                      : "text-red-500"
                  )}
                >
                  {hasData
                    ? `${positive ? "+" : ""}${d!.fundingRatePercent.toFixed(4)}%`
                    : "waiting…"}
                </span>
                <span className="text-xs text-muted-foreground text-right">
                  {hasData ? formatCountdown(d!.nextFundingTime) : "—"}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemove(sym)}
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid={`button-remove-funding-${sym}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="flex-shrink-0 border-t pt-2 mt-2">
        <p className="text-xs text-muted-foreground leading-tight">
          <span className="text-green-500 font-medium">+</span> longs pay shorts ·{" "}
          <span className="text-red-500 font-medium">−</span> shorts pay longs
        </p>
      </div>
    </Card>
  );
}
