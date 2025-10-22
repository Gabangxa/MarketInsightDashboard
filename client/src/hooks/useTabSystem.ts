import { useState, useCallback, useEffect } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { WidgetConfig } from '@/components/ResponsiveLayout';

export interface Tab {
  id: string;
  name: string;
  widgets: string[]; // Widget IDs enabled in this tab
  layouts: any; // Grid layouts for this tab
  isDefault?: boolean;
}

export function useTabSystem(availableWidgets: WidgetConfig[]) {
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: 'default',
      name: 'Main',
      widgets: availableWidgets.map(w => w.id),
      layouts: {},
      isDefault: true,
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('default');

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  
  // Get widgets for active tab
  const activeTabWidgets = availableWidgets.filter(w => 
    activeTab.widgets.includes(w.id)
  );

  const createTab = useCallback((name: string, widgetIds?: string[]) => {
    const newTab: Tab = {
      id: `tab-${Date.now()}`,
      name,
      widgets: widgetIds || availableWidgets.slice(0, 3).map(w => w.id),
      layouts: {},
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [availableWidgets]);

  const updateTab = useCallback((tabId: string, updates: Partial<Tab>) => {
    setTabs(prev => prev.map(t => 
      t.id === tabId ? { ...t, ...updates } : t
    ));
  }, []);

  const deleteTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const filtered = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId && filtered.length > 0) {
        setActiveTabId(filtered[0].id);
      }
      return filtered;
    });
  }, [activeTabId]);

  const switchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const reorderTabs = useCallback((startIndex: number, endIndex: number) => {
    setTabs(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  }, []);

  const saveLayout = useCallback((layouts: any) => {
    setTabs(prev => prev.map(t => 
      t.id === activeTabId ? { ...t, layouts } : t
    ));
  }, [activeTabId]);

  const exportTabs = useCallback(() => {
    return JSON.stringify(tabs, null, 2);
  }, [tabs]);

  const importTabs = useCallback((jsonString: string) => {
    try {
      const imported = JSON.parse(jsonString);
      setTabs(imported);
      if (imported.length > 0) {
        setActiveTabId(imported[0].id);
      }
    } catch (error) {
      console.error('Failed to import tabs:', error);
    }
  }, []);

  const resetTabs = useCallback(() => {
    setTabs([
      {
        id: 'default',
        name: 'Main',
        widgets: availableWidgets.map(w => w.id),
        layouts: {},
        isDefault: true,
      }
    ]);
    setActiveTabId('default');
  }, [availableWidgets]);

  return {
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
    exportTabs,
    importTabs,
    resetTabs,
  };
}
