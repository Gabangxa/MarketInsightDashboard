import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { aggregateMarketData } from "@/lib/marketAggregation";
import { useSymbol } from "@/contexts/SymbolContext";
import type { WatchlistToken as WatchlistTokenType } from "@shared/schema";

export interface WatchlistToken {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  change7d: number;
}

interface WatchlistWidgetProps {
  marketData: Map<string, Map<string, any>>;
  selectedExchanges: string[];
  maxTokens?: number;
}

export default function WatchlistWidget({
  marketData,
  selectedExchanges,
  maxTokens = 10,
}: WatchlistWidgetProps) {
  const [newSymbol, setNewSymbol] = useState("");
  const { selectedSymbol, setSelectedSymbol } = useSymbol();

  // Fetch watchlist
  const { data: watchlistTokens = [], isLoading } = useQuery<WatchlistTokenType[]>({
    queryKey: ["/api/watchlist"],
  });

  // Add watchlist mutation
  const addWatchlistMutation = useMutation({
    mutationFn: async (symbol: string) => {
      const res = await apiRequest("POST", "/api/watchlist", {
        symbol,
        exchanges: selectedExchanges,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
    },
  });

  // Remove watchlist mutation
  const removeWatchlistMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/watchlist/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
    },
  });

  // Calculate watchlist display data
  const tokens = useMemo(() => {
    return watchlistTokens.map((token) => {
      const symbolData = marketData.get(token.symbol);
      if (!symbolData) {
        return {
          id: token.id,
          symbol: token.symbol,
          price: 0,
          change24h: 0,
          volume24h: 0,
          change7d: 0,
        };
      }

      const aggregated = aggregateMarketData(token.symbol, symbolData);
      if (!aggregated) {
        return {
          id: token.id,
          symbol: token.symbol,
          price: 0,
          change24h: 0,
          volume24h: 0,
          change7d: 0,
        };
      }

      return {
        id: token.id,
        symbol: token.symbol,
        price: aggregated.price,
        change24h: aggregated.priceChangePercent,
        volume24h: aggregated.volume24hUSDT,
        change7d: aggregated.priceChangePercent * 1.2, // Mock 7d change
      };
    });
  }, [watchlistTokens, marketData, selectedExchanges]);

  const handleAddToken = () => {
    if (newSymbol.trim() && tokens.length < maxTokens) {
      addWatchlistMutation.mutate(newSymbol.trim().toUpperCase());
      setNewSymbol("");
    }
  };

  const handleRemoveToken = (symbol: string) => {
    const token = watchlistTokens.find(t => t.symbol === symbol);
    if (token) {
      removeWatchlistMutation.mutate(token.id);
    }
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

  return (
    <Card className="h-full p-4 flex flex-col overflow-hidden" data-testid="widget-watchlist">
      <div className="mb-4">
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
            onKeyDown={(e) => e.key === 'Enter' && handleAddToken()}
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

      {/* Column Headers */}
      <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-2 pb-2 border-b border-border text-xs text-muted-foreground">
        <span>Symbol</span>
        <span className="text-right">Price</span>
        <span className="text-right">24h</span>
        <span className="text-right">7d</span>
        <span className="w-6"></span>
      </div>

      {/* Token List */}
      <div className="flex-1 overflow-auto space-y-1 mt-2 min-h-0" data-testid="watchlist-tokens">
        {tokens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Add tokens to your watchlist
          </div>
        ) : (
          tokens.map((token) => (
            <div
              key={token.symbol}
              className={cn(
                "grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-2 py-2 px-2 rounded-lg cursor-pointer hover-elevate transition-colors group items-center",
                selectedSymbol === token.symbol && "bg-primary/10 border border-primary/20"
              )}
              onClick={() => setSelectedSymbol(token.symbol)}
              data-testid={`watchlist-token-${token.symbol}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium">{token.symbol}</span>
              </div>
              
              <div className="flex items-center justify-end">
                <span className="text-xs font-mono font-medium">
                  ${token.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-end gap-1">
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  token.change24h >= 0 ? "text-positive" : "text-negative"
                )}>
                  {token.change24h >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{token.change24h >= 0 ? "+" : ""}{token.change24h.toFixed(2)}%</span>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <span className={cn(
                  "text-xs font-medium",
                  token.change7d >= 0 ? "text-positive" : "text-negative"
                )}>
                  {token.change7d >= 0 ? "+" : ""}{token.change7d.toFixed(2)}%
                </span>
              </div>

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
          ))
        )}
      </div>

      {tokens.length > 0 && (
        <div className="pt-3 border-t border-border mt-2">
          <div className="text-xs text-muted-foreground">
            Click a token to view details in other widgets
          </div>
        </div>
      )}
    </Card>
  );
}
