import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, AlertTriangle, Pencil } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Alert as AlertType } from "@shared/schema";

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
  onAddAlert?: () => void;
  onEditAlert?: (alert: Alert) => void;
}

export default function AlertsWidget({ onAddAlert, onEditAlert }: AlertsWidgetProps) {
  // Fetch alerts
  const { data: rawAlerts = [], isLoading } = useQuery<AlertType[]>({
    queryKey: ["/api/alerts"],
  });

  // Normalize alerts data (parse value to number, convert dates)
  const alerts: Alert[] = rawAlerts.map(a => ({
    id: a.id,
    type: a.type as "price" | "keyword",
    exchanges: a.exchanges as string[],
    condition: a.condition || undefined,
    value: a.value ? parseFloat(a.value) : undefined,
    keyword: a.keyword || undefined,
    triggered: a.triggered,
    lastTriggered: a.lastTriggered ? new Date(a.lastTriggered) : undefined,
    triggerCount: a.triggerCount,
    maxTriggers: a.maxTriggers,
  }));

  // Delete alert mutation
  const deleteAlertMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/alerts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  const handleDeleteAlert = (id: string) => {
    deleteAlertMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <Card className="h-full p-4 flex flex-col overflow-hidden" data-testid="widget-alerts">
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-muted-foreground">Loading alerts...</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full p-4 flex flex-col overflow-hidden" data-testid="widget-alerts">
      <div className="flex items-start justify-between mb-4 widget-drag-handle cursor-move">
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
                      handleDeleteAlert(alert.id);
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
