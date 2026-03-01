import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Activity, Database, Globe, Info } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const EXCHANGES = [
  { name: "Bybit Spot",   endpoint: "wss://stream.bybit.com/v5/public/spot",   status: "active" },
  { name: "Bybit Linear", endpoint: "wss://stream.bybit.com/v5/public/linear",  status: "active" },
  { name: "OKX",          endpoint: "wss://ws.okx.com:8443/ws/v5/public",       status: "active" },
  { name: "Binance Futures (REST)", endpoint: "https://fapi.binance.com",        status: "limited" },
];

const VERSION = "1.0.0";

export default function SettingsModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Settings &amp; System Info
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          {/* Exchange connections */}
          <section>
            <div className="flex items-center gap-2 mb-3 text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Exchange Connections</span>
            </div>
            <div className="space-y-2">
              {EXCHANGES.map((ex) => (
                <div key={ex.name} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 bg-muted/30">
                  <div>
                    <p className="font-medium">{ex.name}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate max-w-[280px]">{ex.endpoint}</p>
                  </div>
                  <Badge
                    variant={ex.status === "active" ? "default" : "secondary"}
                    className={ex.status === "active" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}
                  >
                    {ex.status === "active" ? "Active" : "Limited"}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Binance Futures REST is polled every 30 s and may be geo-restricted on some hosts.
            </p>
          </section>

          <Separator />

          {/* WebSocket */}
          <section>
            <div className="flex items-center gap-2 mb-3 text-muted-foreground">
              <Database className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold uppercase tracking-wider">WebSocket</span>
            </div>
            <div className="rounded-md border border-border/50 px-3 py-2 bg-muted/30 space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Endpoint</span>
                <span className="font-mono text-xs">/ws</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reconnect delay</span>
                <span className="font-mono text-xs">3 s (client) / 5 s (server)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order book throttle</span>
                <span className="font-mono text-xs">300 ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bybit ping interval</span>
                <span className="font-mono text-xs">20 s</span>
              </div>
            </div>
          </section>

          <Separator />

          {/* About */}
          <section>
            <div className="flex items-center gap-2 mb-3 text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold uppercase tracking-wider">About</span>
            </div>
            <div className="rounded-md border border-border/50 px-3 py-2 bg-muted/30 space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Application</span>
                <span className="font-medium">Market Insight Pro</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-mono text-xs">{VERSION}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stack</span>
                <span className="text-xs">React 18 · Express · Drizzle · Neon</span>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
