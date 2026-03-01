import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { useSymbol } from "@/contexts/SymbolContext";
import type { FundingRateData } from "@/lib/useMarketWebSocket";

interface Props {
  fundingRates: Map<string, Map<string, FundingRateData>>;
}

function formatCountdown(nextFundingTime: number): string {
  const diff = nextFundingTime - Date.now();
  if (diff <= 0) return "now";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  if (h > 0) return `in ${h}h ${m}m`;
  if (m > 0) return `in ${m}m ${s}s`;
  return `in ${s}s`;
}

export default function FundingRateWidget({ fundingRates }: Props) {
  const { selectedSymbol } = useSymbol();
  const [, tick] = useState(0);

  // Tick every second to update countdowns
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  const symbolRates = fundingRates.get(selectedSymbol);
  const rows = symbolRates ? Array.from(symbolRates.values()) : [];

  return (
    <div className="flex flex-col h-full p-3 gap-2">
      <div className="flex items-center gap-2 flex-shrink-0">
        <Zap className="h-4 w-4 text-yellow-500" />
        <span className="font-semibold text-sm">Funding Rate</span>
        <span className="text-xs text-muted-foreground ml-auto font-mono">{selectedSymbol}</span>
      </div>

      <div className="flex-1 overflow-auto">
        {rows.length === 0 ? (
          <div className="flex flex-col gap-2 animate-pulse">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <p className="text-xs text-muted-foreground text-center mt-2">Waiting for data…</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 text-xs text-muted-foreground font-medium mb-1 px-1">
              <span>Exchange</span>
              <span className="text-center">Rate</span>
              <span className="text-right">Next funding</span>
            </div>
            {rows.map((r) => {
              const isPositive = r.fundingRate >= 0;
              return (
                <div
                  key={r.exchange}
                  className="grid grid-cols-3 text-xs py-1.5 px-1 rounded hover:bg-muted/50"
                >
                  <span className="font-medium">{r.exchange}</span>
                  <span
                    className={`text-center font-mono font-semibold ${
                      isPositive ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {r.fundingRatePercent.toFixed(4)}%
                  </span>
                  <span className="text-right text-muted-foreground">
                    {formatCountdown(r.nextFundingTime)}
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="flex-shrink-0 border-t pt-2">
        <p className="text-xs text-muted-foreground leading-tight">
          <span className="text-green-500 font-medium">Positive</span> = longs pay shorts ·{" "}
          <span className="text-red-500 font-medium">Negative</span> = shorts pay longs
        </p>
      </div>
    </div>
  );
}
