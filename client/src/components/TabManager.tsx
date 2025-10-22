import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Settings } from "lucide-react";
import { useState } from "react";
import type { Tab } from "@/hooks/useTabSystem";
import type { WidgetConfig } from "@/components/ResponsiveLayout";

interface TabManagerProps {
  tabs: Tab[];
  activeTabId: string;
  availableWidgets: WidgetConfig[];
  onTabChange: (tabId: string) => void;
  onTabCreate: (name: string, widgetIds?: string[]) => void;
  onTabDelete: (tabId: string) => void;
  onTabUpdate: (tabId: string, updates: Partial<Tab>) => void;
}

export default function TabManager({
  tabs,
  activeTabId,
  availableWidgets,
  onTabChange,
  onTabCreate,
  onTabDelete,
  onTabUpdate,
}: TabManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTabName, setNewTabName] = useState("");

  const handleCreateTab = () => {
    if (newTabName.trim()) {
      onTabCreate(newTabName.trim());
      setNewTabName("");
      setIsCreating(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mb-4 overflow-x-auto">
      {tabs.map((tab) => (
        <div key={tab.id} className="relative group">
          <Button
            variant={activeTabId === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => onTabChange(tab.id)}
            className="gap-2"
            data-testid={`button-tab-${tab.id}`}
          >
            {tab.name}
            {!tab.isDefault && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabDelete(tab.id);
                }}
                className="hover:text-destructive"
                data-testid={`button-delete-tab-${tab.id}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Button>
        </div>
      ))}
      
      {isCreating ? (
        <div className="flex items-center gap-2">
          <Input
            value={newTabName}
            onChange={(e) => setNewTabName(e.target.value)}
            placeholder="Tab name..."
            className="h-8 w-32"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateTab();
              if (e.key === "Escape") {
                setIsCreating(false);
                setNewTabName("");
              }
            }}
            data-testid="input-new-tab-name"
          />
          <Button size="sm" onClick={handleCreateTab} data-testid="button-confirm-tab">
            Add
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => {
              setIsCreating(false);
              setNewTabName("");
            }}
            data-testid="button-cancel-tab"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCreating(true)}
          className="gap-2"
          data-testid="button-create-tab"
        >
          <Plus className="h-4 w-4" />
          New Tab
        </Button>
      )}
    </div>
  );
}
