import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface FearGreedData {
  value: string;
  value_classification: string;
  timestamp: string;
  time_until_update?: string;
}

interface FearGreedResponse {
  name: string;
  data: FearGreedData[];
  metadata: {
    error?: string;
  };
}

// Get color and icon based on sentiment value
function getSentimentStyle(value: number): {
  color: string;
  bgColor: string;
  label: string;
  icon: JSX.Element;
} {
  if (value >= 75) {
    return {
      color: "text-red-400",
      bgColor: "bg-red-500/10 border-red-500/30",
      label: "Extreme Greed",
      icon: <TrendingUp className="h-5 w-5 text-red-400" />,
    };
  }
  if (value >= 55) {
    return {
      color: "text-orange-400",
      bgColor: "bg-orange-500/10 border-orange-500/30",
      label: "Greed",
      icon: <TrendingUp className="h-5 w-5 text-orange-400" />,
    };
  }
  if (value >= 45) {
    return {
      color: "text-gray-400",
      bgColor: "bg-gray-500/10 border-gray-500/30",
      label: "Neutral",
      icon: <div className="h-5 w-5 rounded-full border-2 border-gray-400" />,
    };
  }
  if (value >= 25) {
    return {
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10 border-yellow-500/30",
      label: "Fear",
      icon: <TrendingDown className="h-5 w-5 text-yellow-400" />,
    };
  }
  return {
    color: "text-green-400",
    bgColor: "bg-green-500/10 border-green-500/30",
    label: "Extreme Fear",
    icon: <TrendingDown className="h-5 w-5 text-green-400" />,
  };
}

export default function MarketSentimentWidget() {
  // Use React Query with apiRequest for proper authentication and CSRF handling
  const { data, isLoading, error, refetch} = useQuery<FearGreedResponse>({
    queryKey: ["/api/market-sentiment"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/market-sentiment");
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    staleTime: 4 * 60 * 1000, // Consider data stale after 4 minutes
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const sentimentData = data?.data?.[0];
  const value = sentimentData ? parseInt(sentimentData.value) : 0;
  const style = getSentimentStyle(value);

  return (
    <Card className="h-full flex flex-col" data-testid="widget-market-sentiment">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold" data-testid="text-sentiment-title">
          Market Sentiment
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isLoading}
          data-testid="button-refresh-sentiment"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-center space-y-4">
        {error ? (
          <div className="text-center" data-testid="status-sentiment-error">
            <p className="text-sm text-red-400">
              {error instanceof Error ? error.message : "Failed to fetch sentiment data"}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-2"
              data-testid="button-retry-sentiment"
            >
              Retry
            </Button>
          </div>
        ) : isLoading ? (
          <div className="text-center" data-testid="status-sentiment-loading">
            <p className="text-sm text-muted-foreground">Loading sentiment...</p>
          </div>
        ) : sentimentData ? (
          <>
            <div className="flex items-center gap-3">
              <div data-testid="icon-sentiment-indicator">{style.icon}</div>
              <div className="text-center">
                <div
                  className={`text-5xl font-bold font-mono ${style.color}`}
                  data-testid="text-sentiment-value"
                >
                  {value}
                </div>
                <p className="text-xs text-muted-foreground mt-1" data-testid="text-sentiment-scale">
                  out of 100
                </p>
              </div>
            </div>

            <Badge
              variant="outline"
              className={`${style.bgColor} border text-sm px-4 py-1`}
              data-testid="badge-sentiment-classification"
            >
              {sentimentData.value_classification || style.label}
            </Badge>

            {/* Visual gauge */}
            <div className="w-full max-w-xs space-y-2" data-testid="container-sentiment-gauge">
              <div className="h-2 bg-gradient-to-r from-green-500 via-gray-500 to-red-500 rounded-full relative">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-white rounded-full shadow-lg"
                  style={{ left: `${value}%` }}
                  data-testid="indicator-sentiment-position"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span data-testid="text-sentiment-min">Extreme Fear (0)</span>
                <span data-testid="text-sentiment-max">Extreme Greed (100)</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground text-center mt-2" data-testid="text-sentiment-source">
              <p>Data from Alternative.me</p>
              <p className="mt-1">Fear & Greed Index</p>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
