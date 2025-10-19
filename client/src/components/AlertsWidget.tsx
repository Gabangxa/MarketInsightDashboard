import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, AlertTriangle, Pencil } from "lucide-react";
import { format } from "date-fns";

export interface Alert {
  id: string;
  type: "price" | "keyword";
  exchanges: string[];
  condition?: string;
  value?: number;
  keyword?: string;
  triggered: boolean;
  lastTriggered?: Date;
  triggerCount: number;
  maxTriggers: number | null;
}

interface AlertsWidgetProps {
  alerts: Alert[];
  onAddAlert?: () => void;
  onEditAlert?: (alert: Alert) => void;
  onDeleteAlert?: (id: string) => void;
}

export default function AlertsWidget({ alerts, onAddAlert, onEditAlert, onDeleteAlert }: AlertsWidgetProps) {
  return (
    <Card className="h-full p-4 flex flex-col overflow-hidden" data-testid="widget-alerts">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Active Alerts
        </h3>
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onAddAlert?.();
          }}
          className="h-7"
          data-testid="button-add-alert"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Alert
        </Button>
      </div>

      <div className="space-y-2">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No alerts configured
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-3 bg-accent/30 rounded-lg group hover-elevate"
              data-testid={`alert-${alert.id}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant={alert.type === "price" ? "default" : "outline"} className="text-xs">
                    {alert.type === "price" ? "Price" : "Keyword"}
                  </Badge>
                  {alert.triggered && (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditAlert?.(alert);
                    }}
                    className="h-6 w-6"
                    data-testid={`button-edit-alert-${alert.id}`}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteAlert?.(alert.id);
                    }}
                    className="h-6 w-6"
                    data-testid={`button-delete-alert-${alert.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                {alert.type === "price" ? (
                  <p className="text-sm">
                    Price {alert.condition} <span className="font-mono font-medium">${alert.value?.toLocaleString()}</span>
                  </p>
                ) : (
                  <p className="text-sm">
                    Keyword: <span className="font-medium">"{alert.keyword}"</span>
                  </p>
                )}

                <div className="flex flex-wrap gap-1">
                  {alert.exchanges.map((exchange) => (
                    <span
                      key={exchange}
                      className="text-xs px-2 py-0.5 bg-muted rounded-md text-muted-foreground"
                    >
                      {exchange}
                    </span>
                  ))}
                </div>

                {alert.lastTriggered && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last triggered: {format(new Date(alert.lastTriggered), 'MMM d, HH:mm:ss')}
                  </p>
                )}
                
                <p className="text-xs text-muted-foreground mt-1">
                  Triggers: {alert.triggerCount}{alert.maxTriggers !== null ? ` / ${alert.maxTriggers}` : ' (unlimited)'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
