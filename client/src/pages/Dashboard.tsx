import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload, RotateCcw, Layout, Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import TabManager from "@/components/TabManager";
import ResponsiveLayout from "@/components/ResponsiveLayout";
import AlertsWidget, { type Alert as AlertWidgetType } from "@/components/AlertsWidget";
import AlertConfigPanel from "@/components/AlertConfigPanel";
import OrderBookConfigModal from "@/components/OrderBookConfigModal";
import MarketDataConfigModal from "@/components/MarketDataConfigModal";
import { useMarketWebSocket } from "@/lib/useMarketWebSocket";
import { aggregateMarketData, aggregateOrderBook } from "@/lib/marketAggregation";
import { useAlertMonitor } from "@/lib/useAlertMonitor";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTabSystem } from "@/hooks/useTabSystem";
import { useToast } from "@/hooks/use-toast";
import { createAvailableWidgets } from "@/config/widgets";
import { SymbolProvider, useSymbol } from "@/contexts/SymbolContext";
import type { WatchlistToken, Alert, WebhookMessage } from "@shared/schema";

function DashboardContent() {
  const [isAlertPanelOpen, setIsAlertPanelOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertWidgetType | null>(null);
  const [isMarketConfigOpen, setIsMarketConfigOpen] = useState(false);
  const [isOrderBookConfigOpen, setIsOrderBookConfigOpen] = useState(false);
  const [orderBookViewMode, setOrderBookViewMode] = useState<"both" | "bids" | "asks">("both");
  // Note: Binance is currently geo-blocked, using Bybit only
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>(["Bybit"]);
  const [isAddWidgetDialogOpen, setIsAddWidgetDialogOpen] = useState(false);
  const [selectedWidgetsToAdd, setSelectedWidgetsToAdd] = useState<string[]>([]);
  const [isLayoutEditable, setIsLayoutEditable] = useState(false);

  const { selectedSymbol, setSelectedSymbol } = useSymbol();

  const { toast } = useToast();

  // WebSocket connection
  const { marketData, orderBooks, newWebhook, isConnected, subscribe, unsubscribe } = useMarketWebSocket();

  // Fetch data for coordination (WebSocket subscriptions, alert monitoring)
  // These queries are shared with widgets (React Query deduplicates automatically)
  const { data: watchlistTokens = [] } = useQuery<WatchlistToken[]>({
    queryKey: ["/api/watchlist"],
  });

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const { data: webhookMessages = [] } = useQuery<WebhookMessage[]>({
    queryKey: ["/api/webhooks"],
  });

  // Alert monitor
  useAlertMonitor({
    alerts,
    marketData,
    newWebhook,
  });

  // Alert mutations (for add/update only - delete is handled by AlertsWidget)
  const addAlertMutation = useMutation({
    mutationFn: async (config: any) => {
      const res = await apiRequest("POST", "/api/alerts", config);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      setIsAlertPanelOpen(false);
      setEditingAlert(null);
    },
  });

  const updateAlertMutation = useMutation({
    mutationFn: async (config: any) => {
      const { id, ...data } = config;
      const res = await apiRequest("PATCH", `/api/alerts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      setIsAlertPanelOpen(false);
      setEditingAlert(null);
    },
  });

  // Webhook mutations
  const toggleBookmarkMutation = useMutation({
    mutationFn: async ({ id, bookmarked }: { id: string; bookmarked: boolean }) => {
      const res = await apiRequest("PATCH", `/api/webhooks/${id}`, { bookmarked: !bookmarked });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
    },
  });

  // Handle new webhooks from WebSocket
  useEffect(() => {
    if (newWebhook) {
      queryClient.setQueryData(["/api/webhooks"], (old: any = []) => {
        // Check if webhook already exists to prevent duplicates
        if (old.some((w: any) => w.id === newWebhook.id)) return old;
        // Add new webhook at the beginning (newest first)
        return [newWebhook, ...old];
      });
    }
  }, [newWebhook]);

  // Subscribe to symbols on watchlist
  useEffect(() => {
    watchlistTokens.forEach((token) => {
      subscribe(token.symbol, token.exchanges as string[]);
    });

    return () => {
      watchlistTokens.forEach((token) => {
        unsubscribe(token.symbol);
      });
    };
  }, [watchlistTokens, subscribe, unsubscribe]);

  // Subscribe to selected symbol
  useEffect(() => {
    subscribe(selectedSymbol, selectedExchanges);
    return () => {
      unsubscribe(selectedSymbol);
    };
  }, [selectedSymbol, selectedExchanges, subscribe, unsubscribe]);


  // Stable exchanges array for Technical Indicators Widget
  const technicalIndicatorExchanges = useMemo(() => ["bybit", "okx"], []);

  // Define all available widgets for the tab system
  const availableWidgets = useMemo(() => createAvailableWidgets({
    marketData,
    orderBooks,
    selectedExchanges,
    onMarketConfigure: () => {
      console.log("Opening market config modal");
      setIsMarketConfigOpen(true);
    },
    orderBookViewMode,
    onOrderBookConfigure: () => {
      console.log("Opening order book config modal");
      setIsOrderBookConfigOpen(true);
    },
    webhookMessages,
    onToggleBookmark: (id) => {
      const msg = webhookMessages.find(m => m.id === id);
      if (msg) {
        toggleBookmarkMutation.mutate({ id, bookmarked: msg.bookmarked });
      }
    },
    onAddAlert: () => {
      setEditingAlert(null);
      setIsAlertPanelOpen(true);
    },
    onEditAlert: (alert) => {
      setEditingAlert(alert);
      setIsAlertPanelOpen(true);
    },
    technicalIndicatorExchanges,
  }), [
    marketData, orderBooks, selectedExchanges, orderBookViewMode, 
    webhookMessages, toggleBookmarkMutation, technicalIndicatorExchanges
  ]);

  // Initialize tab system
  const {
    tabs,
    activeTabId,
    activeTab,
    activeTabWidgets,
    createTab,
    updateTab,
    deleteTab,
    switchTab,
    reorderTabs,
    saveLayout,
    addWidgetsToActiveTab,
    exportTabs,
    importTabs,
    resetTabs
  } = useTabSystem(availableWidgets);

  // Reset edit mode when tab changes
  useEffect(() => {
    setIsLayoutEditable(false);
  }, [activeTabId]);

  return (
    <div className="h-full bg-background overflow-hidden" data-testid="page-dashboard">
      {/* Tab Management System */}
      <TabManager
        tabs={tabs}
        activeTabId={activeTabId}
        availableWidgets={availableWidgets}
        onTabChange={switchTab}
        onTabCreate={createTab}
        onTabUpdate={updateTab}
        onTabDelete={deleteTab}
        onTabReorder={reorderTabs}
      />

      <div className="h-full flex flex-col overflow-hidden p-4 md:p-6">
        {/* Dashboard Actions */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {activeTab?.name || 'Dashboard'}
            </h2>
            {activeTab?.description && (
              <span className="text-sm text-muted-foreground">
                {activeTab.description}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={isLayoutEditable ? "default" : "outline"}
              size="sm"
              onClick={() => setIsLayoutEditable(!isLayoutEditable)}
              className="gap-2"
              data-testid="button-edit-layout"
            >
              {isLayoutEditable ? (
                <>
                  <Check className="h-4 w-4" />
                  Done Editing
                </>
              ) : (
                <>
                  <Layout className="h-4 w-4" />
                  Edit Layout
                </>
              )}
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setSelectedWidgetsToAdd([]);
                setIsAddWidgetDialogOpen(true);
              }}
              className="gap-2"
              data-testid="button-add-widget"
            >
              <Plus className="h-4 w-4" />
              Add Widget
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportTabs}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>

            <input
              type="file"
              accept=".json"
              className="hidden"
              id="import-tabs"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  importTabs(file).then(() => {
                    toast({
                      title: "Success",
                      description: "Tabs imported successfully"
                    });
                  }).catch((error) => {
                    toast({
                      title: "Error", 
                      description: "Failed to import tabs: " + error.message,
                      variant: "destructive"
                    });
                  });
                }
                e.target.value = '';
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('import-tabs')?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetTabs();
                toast({
                  title: "Reset Complete",
                  description: "Dashboard reset to default configuration"
                });
              }}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        {/* Tab-Based Responsive Layout */}
        <div className="flex-1 overflow-hidden">
          <ResponsiveLayout
            widgets={activeTabWidgets}
            initialLayout={activeTab?.layout}
            isEditable={isLayoutEditable}
            onLayoutChange={(layouts) => {
              saveLayout(layouts);
            }}
            onSaveLayout={() => {
              toast({
                title: "Layout Saved",
                description: `Layout saved for "${activeTab?.name}"`
              });
              setIsLayoutEditable(false);
            }}
          />
        </div>
      </div>

      <AlertConfigPanel
        isOpen={isAlertPanelOpen}
        onClose={() => {
          setIsAlertPanelOpen(false);
          setEditingAlert(null);
        }}
        editingAlert={editingAlert ? {
          id: editingAlert.id,
          type: editingAlert.type as "price" | "keyword",
          exchanges: editingAlert.exchanges,
          symbol: editingAlert.type === "price" ? (alerts.find(a => a.id === editingAlert.id)?.symbol || "") : undefined,
          condition: editingAlert.condition || undefined,
          value: editingAlert.value?.toString() || undefined,
          keyword: editingAlert.keyword || undefined,
          maxTriggers: editingAlert.maxTriggers || null,
        } : null}
        onSave={(config) => {
          // Ensure value is string for backend decimal type
          const alertData = {
            ...config,
            ...(config.value !== undefined && { value: String(config.value) })
          };

          if (config.id) {
            // Update existing alert
            updateAlertMutation.mutate(alertData);
          } else {
            // Create new alert
            addAlertMutation.mutate(alertData);
          }
        }}
      />

      <MarketDataConfigModal
        isOpen={isMarketConfigOpen}
        onClose={() => setIsMarketConfigOpen(false)}
        selectedExchanges={selectedExchanges}
        onExchangesChange={setSelectedExchanges}
      />

      <OrderBookConfigModal
        isOpen={isOrderBookConfigOpen}
        onClose={() => setIsOrderBookConfigOpen(false)}
        viewMode={orderBookViewMode}
        onViewModeChange={setOrderBookViewMode}
        selectedExchanges={selectedExchanges}
        onExchangesChange={setSelectedExchanges}
      />

      {/* Add Widget Dialog */}
      <Dialog open={isAddWidgetDialogOpen} onOpenChange={setIsAddWidgetDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Widgets to {activeTab?.name}</DialogTitle>
            <DialogDescription>
              Select widgets to add to this tab
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {(() => {
              // Filter out widgets already in the current tab
              const availableToAdd = availableWidgets.filter(
                widget => !activeTab?.widgets.includes(widget.id)
              );

              if (availableToAdd.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground" data-testid="text-no-widgets-available">
                    All available widgets have already been added to this tab.
                  </div>
                );
              }

              // Group by category
              const widgetsByCategory = availableToAdd.reduce((acc, widget) => {
                const category = widget.category || 'other';
                if (!acc[category]) acc[category] = [];
                acc[category].push(widget);
                return acc;
              }, {} as Record<string, typeof availableWidgets>);

              return Object.entries(widgetsByCategory).map(([category, widgets]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium capitalize text-muted-foreground mb-2" data-testid={`heading-widget-category-${category}`}>
                    {category}
                  </h4>
                  <div className="space-y-2 pl-4">
                    {widgets.map((widget) => (
                      <div key={widget.id} className="flex items-center space-x-2" data-testid={`widget-option-${widget.id}`}>
                        <Checkbox
                          id={`add-widget-${widget.id}`}
                          checked={selectedWidgetsToAdd.includes(widget.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedWidgetsToAdd(prev => [...prev, widget.id]);
                            } else {
                              setSelectedWidgetsToAdd(prev => prev.filter(id => id !== widget.id));
                            }
                          }}
                          data-testid={`checkbox-add-widget-${widget.id}`}
                        />
                        <label
                          htmlFor={`add-widget-${widget.id}`}
                          className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                          data-testid={`label-add-widget-${widget.id}`}
                        >
                          <span data-testid={`text-widget-title-${widget.id}`}>{widget.title}</span>
                          {widget.priority && (
                            <Badge variant={widget.priority === 'high' ? 'default' : 'secondary'} className="text-xs" data-testid={`badge-widget-priority-${widget.id}`}>
                              {widget.priority}
                            </Badge>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedWidgetsToAdd([]);
                setIsAddWidgetDialogOpen(false);
              }}
              data-testid="button-cancel-add-widget"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedWidgetsToAdd.length > 0) {
                  addWidgetsToActiveTab(selectedWidgetsToAdd);
                  toast({
                    title: "Widgets Added",
                    description: `Added ${selectedWidgetsToAdd.length} widget${selectedWidgetsToAdd.length > 1 ? 's' : ''} to ${activeTab?.name}`
                  });
                  setSelectedWidgetsToAdd([]);
                  setIsAddWidgetDialogOpen(false);
                }
              }}
              disabled={selectedWidgetsToAdd.length === 0}
              data-testid="button-confirm-add-widget"
            >
              Add {selectedWidgetsToAdd.length > 0 && `(${selectedWidgetsToAdd.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Dashboard() {
  return (
    <SymbolProvider>
      <DashboardContent />
    </SymbolProvider>
  );
}