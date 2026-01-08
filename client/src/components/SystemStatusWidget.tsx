import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Wifi, WifiOff, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export interface SystemStatus {
  exchange: string;
  status: "connected" | "disconnected" | "reconnecting";
  latency: number;
  lastUpdate: number;
}

interface SystemStatusWidgetProps {
  statuses: Map<string, SystemStatus>;
}

export default function SystemStatusWidget({ statuses }: SystemStatusWidgetProps) {
  // Force re-render every second to update "freshness" display if needed
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "reconnecting": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      case "disconnected": return "text-red-500 bg-red-500/10 border-red-500/20";
      default: return "text-muted-foreground bg-muted border-border";
    }
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 100) return "text-emerald-500";
    if (latency < 300) return "text-yellow-500";
    return "text-red-500";
  };

  const exchanges = Array.from(statuses.values()).sort((a, b) => a.exchange.localeCompare(b.exchange));

  return (
    <Card className="h-full p-4 flex flex-col" data-testid="widget-system-status">
      <div className="flex items-center justify-between mb-4 widget-drag-handle cursor-move">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            System Status
          </h3>
        </div>
      </div>

      <div className="space-y-4 overflow-y-auto pr-1">
        {exchanges.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-4">
            No active connections
          </div>
        ) : (
          exchanges.map((status) => {
            const timeSinceUpdate = Date.now() - status.lastUpdate;
            return (
              <div key={status.exchange} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{status.exchange}</span>
                  <Badge variant="outline" className={cn("capitalize", getStatusColor(status.status))}>
                    {status.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 bg-accent/30 p-2 rounded-md">
                    {status.status === "connected" ? (
                      <Wifi className={cn("h-3 w-3", getLatencyColor(status.latency))} />
                    ) : (
                      <WifiOff className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className="text-muted-foreground">Latency:</span>
                    <span className={cn("font-mono font-medium ml-auto", getLatencyColor(status.latency))}>
                      {status.latency}ms
                    </span>
                  </div>

                  <div className="flex items-center gap-2 bg-accent/30 p-2 rounded-md">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Updated:</span>
                    <span className="font-mono font-medium ml-auto">
                      {Math.floor(timeSinceUpdate / 1000)}s ago
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
