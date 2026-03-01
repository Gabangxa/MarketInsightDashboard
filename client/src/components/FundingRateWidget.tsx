import { useEffect, useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FundingRateData } from "@shared/types";

const MAX_SYMBOLS = 10;
const STORAGE_KEY = "funding-rate-tracked-symbols";
const REFETCH_INTERVAL_FAST_MS = 5_000;
const REFETCH_INTERVAL_NORMAL_MS = 30_000;

interface RateTier {
  label: string;
  description: string;
  textClass: string;
  dotClass: string;
}

const RATE_TIERS: RateTier[] = [
  {
    label: "> 0.05% (per 8hr)",
    description: "Extreme — historically precedes corrections",
    textClass: "text-red-500",
    dotClass: "bg-red-500",
  },
  {
    label: "0.03% to 0.05%",
    description: "Elevated longs, caution zone",
    textClass: "text-orange-400",
    dotClass: "bg-orange-400",
  },
  {
    label: "0.01% to 0.03%",
    description: "Mild long bias, healthy uptrend",
    textClass: "text-emerald-500",
    dotClass: "bg-emerald-500",
  },
  {
    label: "0.00% to 0.01%",
    description: "Neutral / balanced",
    textClass: "text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
  {
    label: "\u20130.01% to \u20130.03%",
    description: "Mild short bias",
    textClass: "text-sky-400",
    dotClass: "bg-sky-400",
  },
  {
    label: "< \u20130.03%",
    description: "Extreme fear, potential short squeeze setup",
    textClass: "text-purple-500",
    dotClass: "bg-purple-500",
  },
];

function getRateTier(pct: number): RateTier {
  if (pct > 0.05) return RATE_TIERS[0];
  if (pct > 0.03) return RATE_TIERS[1];
  if (pct > 0.01) return RATE_TIERS[2];
  if (pct >= 0)   return RATE_TIERS[3];
  if (pct >= -0.03) return RATE_TIERS[4];
  return RATE_TIERS[5];
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

export default function FundingRateWidget() {
  const [trackedSymbols, setTrackedSymbols] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
    } catch {
      return ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
    }
  });
  const [newSymbol, setNewSymbol] = useState("");
  const [legendOpen, setLegendOpen] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trackedSymbols));
  }, [trackedSymbols]);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  const symbolsQuery = trackedSymbols.join(",");

  const { data: rawRates = [] } = useQuery<FundingRateData[]>({
    queryKey: ["/api/funding-rates", symbolsQuery],
    queryFn: async () => {
      if (!symbolsQuery) return [];
      const res = await fetch(`/api/funding-rates?symbols=${symbolsQuery}`);
      if (!res.ok) throw new Error("Failed to fetch funding rates");
      return res.json();
    },
    refetchInterval: (query) => {
      const data = query.state.data as FundingRateData[] | undefined;
      const hasAllData = data && data.length >= trackedSymbols.length;
      return hasAllData ? REFETCH_INTERVAL_NORMAL_MS : REFETCH_INTERVAL_FAST_MS;
    },
    enabled: trackedSymbols.length > 0,
  });

  const fundingRates = useMemo(() => {
    const map = new Map<string, FundingRateData>();
    rawRates.forEach((d) => map.set(d.symbol, d));
    return map;
  }, [rawRates]);

  const handleAdd = useCallback(() => {
    const sym = newSymbol.trim().toUpperCase();
    if (!sym || trackedSymbols.includes(sym) || trackedSymbols.length >= MAX_SYMBOLS) return;
    setTrackedSymbols((prev) => [...prev, sym]);
    setNewSymbol("");
  }, [newSymbol, trackedSymbols]);

  const handleRemove = useCallback((sym: string) => {
    setTrackedSymbols((prev) => prev.filter((s) => s !== sym));
  }, []);

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
          size="icon"
          onClick={handleAdd}
          disabled={!newSymbol.trim() || trackedSymbols.length >= MAX_SYMBOLS}
          data-testid="button-add-funding-symbol"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Column headers */}
      <div
        className="grid pb-2 border-b border-border text-xs text-muted-foreground font-medium gap-1"
        style={{ gridTemplateColumns: "2fr 1fr 1fr auto" }}
      >
        <span>Symbol</span>
        <span className="text-center">Rate</span>
        <span className="text-right">Next funding</span>
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
            const d = fundingRates.get(sym);
            const hasData = !!d;
            const tier = hasData ? getRateTier(d!.fundingRatePercent) : null;
            const sign = hasData && d!.fundingRatePercent >= 0 ? "+" : "";

            return (
              <div
                key={sym}
                className="grid gap-1 py-1.5 px-1 rounded items-center group"
                style={{ gridTemplateColumns: "2fr 1fr 1fr auto" }}
                data-testid={`funding-row-${sym}`}
              >
                <span className="text-xs font-medium truncate">{sym}</span>
                <span
                  className={cn(
                    "text-xs font-mono font-semibold text-center",
                    tier ? tier.textClass : "text-muted-foreground"
                  )}
                >
                  {hasData ? `${sign}${d!.fundingRatePercent.toFixed(4)}%` : "—"}
                </span>
                <span className="text-xs text-muted-foreground text-right">
                  {hasData ? formatCountdown(d!.nextFundingTime) : "—"}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemove(sym)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid={`button-remove-funding-${sym}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })
        )}
      </div>

      {/* Legend footer */}
      <div className="flex-shrink-0 border-t mt-2">
        <button
          className="flex items-center justify-between w-full pt-2 pb-1 text-xs text-muted-foreground hover-elevate rounded"
          onClick={() => setLegendOpen((v) => !v)}
          data-testid="button-toggle-legend"
        >
          <span className="font-medium">Rate interpretation</span>
          {legendOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        <div
          className={cn(
            "overflow-hidden transition-all duration-200",
            legendOpen ? "max-h-64 pb-2" : "max-h-0"
          )}
        >
          <div className="space-y-1 pt-1">
            {RATE_TIERS.map((tier) => (
              <div key={tier.label} className="flex items-start gap-2">
                <span
                  className={cn("mt-0.5 h-2 w-2 rounded-full flex-shrink-0", tier.dotClass)}
                />
                <div className="min-w-0">
                  <span className={cn("text-xs font-mono font-semibold", tier.textClass)}>
                    {tier.label}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1.5">
                    {tier.description}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
