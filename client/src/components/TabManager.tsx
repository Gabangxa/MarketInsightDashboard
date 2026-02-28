import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Settings, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Layout } from "react-grid-layout";
import type { WidgetConfig } from "./ResponsiveLayout";
import TabFormFields from "./TabFormFields";

export interface TabConfig {
  id: string;
  name: string;
  description?: string;
  widgets: string[];
  layout?: { [key: string]: Layout[] };
  createdAt: Date;
  updatedAt: Date;
}

interface TabManagerProps {
  tabs: TabConfig[];
  activeTabId: string;
  availableWidgets: WidgetConfig[];
  onTabChange: (tabId: string) => void;
  onTabCreate: (tab: Omit<TabConfig, "id" | "createdAt" | "updatedAt">) => void;
  onTabUpdate: (tabId: string, updates: Partial<TabConfig>) => void;
  onTabDelete: (tabId: string) => void;
  onTabReorder: (tabs: TabConfig[]) => void;
  className?: string;
}

/** Blank form state */
const EMPTY_FORM = { name: "", description: "", widgets: [] as string[] };

export default function TabManager({
  tabs,
  activeTabId,
  availableWidgets,
  onTabChange,
  onTabCreate,
  onTabUpdate,
  onTabDelete,
  className,
}: TabManagerProps) {
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [newTab, setNewTab] = useState(EMPTY_FORM);

  // Per-tab edit state (only one tab can be edited at a time via the manage dialog)
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  const handleCreateTab = () => {
    if (!newTab.name.trim()) return;
    onTabCreate({
      name: newTab.name.trim(),
      description: newTab.description.trim() || undefined,
      widgets: newTab.widgets,
      layout: undefined,
    });
    setNewTab(EMPTY_FORM);
    setIsAddingTab(false);
  };

  const handleUpdateTab = (tabId: string) => {
    if (!editForm.name.trim()) return;
    onTabUpdate(tabId, {
      name: editForm.name.trim(),
      description: editForm.description.trim() || undefined,
      widgets: editForm.widgets,
      updatedAt: new Date(),
    });
    setEditingTabId(null);
    setEditForm(EMPTY_FORM);
  };

  const startEditing = (tab: TabConfig) => {
    setEditingTabId(tab.id);
    setEditForm({
      name: tab.name,
      description: tab.description ?? "",
      widgets: [...tab.widgets],
    });
  };

  const toggleWidget = (
    form: typeof EMPTY_FORM,
    setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>,
    widgetId: string,
    checked: boolean
  ) => {
    setForm({
      ...form,
      widgets: checked
        ? [...form.widgets, widgetId]
        : form.widgets.filter((id) => id !== widgetId),
    });
  };

  return (
    <div className={cn("border-b border-border", className)}>
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
        {tabs.map((tab) => (
          <div key={tab.id} className="flex items-center gap-1 group">
            <Button
              variant={activeTabId === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 min-w-0",
                activeTabId === tab.id && "bg-primary text-primary-foreground"
              )}
              data-testid={`button-tab-${tab.id}`}
            >
              <span className="truncate max-w-32">{tab.name}</span>
              <Badge variant="secondary" className="text-xs">
                {tab.widgets.length}
              </Badge>
            </Button>

            {/* Tab Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Manage dialog */}
              <Dialog
                onOpenChange={(open) => {
                  if (open) startEditing(tab);
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    data-testid={`button-manage-tab-${tab.id}`}
                    aria-label={`Manage tab ${tab.name}`}
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Manage Tab: {tab.name}</DialogTitle>
                    <DialogDescription>
                      Configure widgets and settings for this tab
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {editingTabId === tab.id && (
                      <TabFormFields
                        name={editForm.name}
                        description={editForm.description}
                        selectedWidgets={editForm.widgets}
                        availableWidgets={availableWidgets}
                        idPrefix={`edit-${tab.id}-`}
                        onNameChange={(v) =>
                          setEditForm((f) => ({ ...f, name: v }))
                        }
                        onDescriptionChange={(v) =>
                          setEditForm((f) => ({ ...f, description: v }))
                        }
                        onWidgetToggle={(id, checked) =>
                          toggleWidget(editForm, setEditForm, id, checked)
                        }
                      />
                    )}

                    <div className="flex justify-between">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2"
                            data-testid="button-delete-tab-dialog"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Tab
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Tab</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{tab.name}"?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid="button-cancel-delete">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onTabDelete(tab.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              data-testid="button-confirm-delete"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <Button
                        onClick={() => handleUpdateTab(tab.id)}
                        disabled={editingTabId !== tab.id}
                        className="gap-2"
                        data-testid="button-save-tab-changes"
                      >
                        <Save className="h-4 w-4" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Quick delete button (visible when > 1 tab) */}
              {tabs.length > 1 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      data-testid={`button-delete-tab-${tab.id}`}
                      aria-label={`Delete tab ${tab.name}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Tab</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{tab.name}"? This
                        action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onTabDelete(tab.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        ))}

        {/* Add New Tab */}
        <Dialog open={isAddingTab} onOpenChange={setIsAddingTab}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 flex-shrink-0"
              data-testid="button-add-tab"
            >
              <Plus className="h-4 w-4" />
              Add Tab
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Tab</DialogTitle>
              <DialogDescription>
                Set up a new tab with your preferred widgets
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <TabFormFields
                name={newTab.name}
                description={newTab.description}
                selectedWidgets={newTab.widgets}
                availableWidgets={availableWidgets}
                idPrefix="new-"
                onNameChange={(v) => setNewTab((f) => ({ ...f, name: v }))}
                onDescriptionChange={(v) =>
                  setNewTab((f) => ({ ...f, description: v }))
                }
                onWidgetToggle={(id, checked) =>
                  toggleWidget(newTab, setNewTab, id, checked)
                }
              />

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddingTab(false)}
                  data-testid="button-cancel-new-tab"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTab}
                  disabled={!newTab.name.trim()}
                  className="gap-2"
                  data-testid="button-create-tab"
                >
                  <Plus className="h-4 w-4" />
                  Create Tab
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Tab Info */}
      {activeTab && (
        <div className="px-4 py-2 bg-accent/20 border-t border-accent/40">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="font-medium">{activeTab.name}</span>
              {activeTab.description && (
                <span className="text-muted-foreground">
                  {activeTab.description}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{activeTab.widgets.length} widgets</span>
              <span>•</span>
              <span>Updated {activeTab.updatedAt.toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
