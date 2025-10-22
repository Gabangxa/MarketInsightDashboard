import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Plus,
  X,
  Edit3,
  Save,
  Settings,
  Trash2,
  GripVertical,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Layout } from 'react-grid-layout';
import type { WidgetConfig } from './ResponsiveLayout';

export interface TabConfig {
  id: string;
  name: string;
  description?: string;
  widgets: string[]; // Widget IDs that are enabled for this tab
  layout?: { [key: string]: Layout[] }; // Responsive layouts for this tab
  createdAt: Date;
  updatedAt: Date;
}

interface TabManagerProps {
  tabs: TabConfig[];
  activeTabId: string;
  availableWidgets: WidgetConfig[];
  onTabChange: (tabId: string) => void;
  onTabCreate: (tab: Omit<TabConfig, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onTabUpdate: (tabId: string, updates: Partial<TabConfig>) => void;
  onTabDelete: (tabId: string) => void;
  onTabReorder: (tabs: TabConfig[]) => void;
  className?: string;
}

export default function TabManager({
  tabs,
  activeTabId,
  availableWidgets,
  onTabChange,
  onTabCreate,
  onTabUpdate,
  onTabDelete,
  onTabReorder,
  className
}: TabManagerProps) {
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [newTabName, setNewTabName] = useState('');
  const [newTabDescription, setNewTabDescription] = useState('');
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([]);
  const [isManagingTab, setIsManagingTab] = useState<string | null>(null);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // Handle new tab creation
  const handleCreateTab = () => {
    if (!newTabName.trim()) return;
    
    onTabCreate({
      name: newTabName.trim(),
      description: newTabDescription.trim() || undefined,
      widgets: selectedWidgets,
      layout: undefined
    });

    // Reset form
    setNewTabName('');
    setNewTabDescription('');
    setSelectedWidgets([]);
    setIsAddingTab(false);
  };

  // Handle tab editing
  const handleUpdateTab = (tabId: string) => {
    if (!newTabName.trim()) return;

    onTabUpdate(tabId, {
      name: newTabName.trim(),
      description: newTabDescription.trim() || undefined,
      widgets: selectedWidgets,
      updatedAt: new Date()
    });

    // Reset form
    setNewTabName('');
    setNewTabDescription('');
    setSelectedWidgets([]);
    setEditingTabId(null);
  };

  // Start editing a tab
  const startEditing = (tab: TabConfig) => {
    setNewTabName(tab.name);
    setNewTabDescription(tab.description || '');
    setSelectedWidgets([...tab.widgets]);
    setEditingTabId(tab.id);
  };

  // Handle widget selection change
  const handleWidgetToggle = (widgetId: string, checked: boolean) => {
    if (checked) {
      setSelectedWidgets(prev => [...prev, widgetId]);
    } else {
      setSelectedWidgets(prev => prev.filter(id => id !== widgetId));
    }
  };

  // Widget categories for better organization
  const widgetsByCategory = availableWidgets.reduce((acc, widget) => {
    const category = widget.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(widget);
    return acc;
  }, {} as Record<string, WidgetConfig[]>);

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
            >
              <span className="truncate max-w-32">{tab.name}</span>
              <Badge variant="secondary" className="text-xs">
                {tab.widgets.length}
              </Badge>
            </Button>

            {/* Tab Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setIsManagingTab(tab.id)}
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Tab Name</label>
                        <Input
                          value={editingTabId === tab.id ? newTabName : tab.name}
                          onChange={(e) => {
                            if (editingTabId === tab.id) {
                              setNewTabName(e.target.value);
                            } else {
                              startEditing(tab);
                              setNewTabName(e.target.value);
                            }
                          }}
                          placeholder="Enter tab name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Input
                          value={editingTabId === tab.id ? newTabDescription : (tab.description || '')}
                          onChange={(e) => {
                            if (editingTabId === tab.id) {
                              setNewTabDescription(e.target.value);
                            } else {
                              startEditing(tab);
                              setNewTabDescription(e.target.value);
                            }
                          }}
                          placeholder="Optional description"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-3 block">Select Widgets</label>
                      <div className="space-y-4 max-h-60 overflow-y-auto">
                        {Object.entries(widgetsByCategory).map(([category, widgets]) => (
                          <div key={category}>
                            <h4 className="text-sm font-medium capitalize text-muted-foreground mb-2">
                              {category}
                            </h4>
                            <div className="space-y-2 pl-4">
                              {widgets.map((widget) => {
                                const isSelected = editingTabId === tab.id 
                                  ? selectedWidgets.includes(widget.id)
                                  : tab.widgets.includes(widget.id);
                                
                                return (
                                  <div key={widget.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`widget-${widget.id}`}
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        if (editingTabId !== tab.id) {
                                          startEditing(tab);
                                        }
                                        handleWidgetToggle(widget.id, checked as boolean);
                                      }}
                                    />
                                    <label
                                      htmlFor={`widget-${widget.id}`}
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                      {widget.title}
                                    </label>
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs"
                                    >
                                      {widget.priority}
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" className="gap-2">
                            <Trash2 className="h-4 w-4" />
                            Delete Tab
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Tab</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{tab.name}"? This action cannot be undone.
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

                      <Button
                        onClick={() => handleUpdateTab(tab.id)}
                        disabled={editingTabId !== tab.id}
                        className="gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {tabs.length > 1 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Tab</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{tab.name}"? This action cannot be undone.
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
            <Button variant="outline" size="sm" className="gap-2 flex-shrink-0">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tab Name *</label>
                  <Input
                    value={newTabName}
                    onChange={(e) => setNewTabName(e.target.value)}
                    placeholder="Enter tab name"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={newTabDescription}
                    onChange={(e) => setNewTabDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">Select Widgets</label>
                <div className="space-y-4 max-h-60 overflow-y-auto">
                  {Object.entries(widgetsByCategory).map(([category, widgets]) => (
                    <div key={category}>
                      <h4 className="text-sm font-medium capitalize text-muted-foreground mb-2">
                        {category}
                      </h4>
                      <div className="space-y-2 pl-4">
                        {widgets.map((widget) => (
                          <div key={widget.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`new-widget-${widget.id}`}
                              checked={selectedWidgets.includes(widget.id)}
                              onCheckedChange={(checked) => 
                                handleWidgetToggle(widget.id, checked as boolean)
                              }
                            />
                            <label
                              htmlFor={`new-widget-${widget.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {widget.title}
                            </label>
                            <Badge variant="outline" className="text-xs">
                              {widget.priority}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddingTab(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTab}
                  disabled={!newTabName.trim()}
                  className="gap-2"
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
                <span className="text-muted-foreground">{activeTab.description}</span>
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