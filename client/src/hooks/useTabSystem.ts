import { useState, useEffect, useCallback } from 'react';
import { Layout } from 'react-grid-layout';
import type { TabConfig } from '@/components/TabManager';
import type { WidgetConfig } from '@/components/ResponsiveLayout';

interface TabSystemState {
  tabs: TabConfig[];
  activeTabId: string;
}

const DEFAULT_TAB: Omit<TabConfig, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Main Dashboard',
  description: 'Default dashboard with all widgets',
  widgets: [
    'watchlist-1',
    'market-1', 
    'orderbook-1',
    'webhook-1',
    'alerts-1'
  ],
  layout: undefined
};

const STORAGE_KEY = 'market-dashboard-tabs';

export function useTabSystem(availableWidgets: WidgetConfig[]) {
  const [state, setState] = useState<TabSystemState>(() => {
    // Load from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedState = JSON.parse(saved);
        // Convert date strings back to Date objects
        const tabs = parsedState.tabs.map((tab: any) => ({
          ...tab,
          createdAt: new Date(tab.createdAt),
          updatedAt: new Date(tab.updatedAt)
        }));
        
        return {
          tabs,
          activeTabId: parsedState.activeTabId
        };
      }
    } catch (error) {
      console.error('Failed to load tabs from localStorage:', error);
    }

    // Create default tab if no saved state
    const defaultTab: TabConfig = {
      ...DEFAULT_TAB,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return {
      tabs: [defaultTab],
      activeTabId: defaultTab.id
    };
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save tabs to localStorage:', error);
    }
  }, [state]);

  // Generate unique ID
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // Get active tab
  const activeTab = state.tabs.find(tab => tab.id === state.activeTabId);

  // Get widgets for active tab
  const activeTabWidgets = availableWidgets.filter(widget => 
    activeTab?.widgets.includes(widget.id)
  );

  // Tab management functions
  const createTab = useCallback((tabData: Omit<TabConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTab: TabConfig = {
      ...tabData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setState(prev => ({
      tabs: [...prev.tabs, newTab],
      activeTabId: newTab.id
    }));

    return newTab.id;
  }, []);

  const updateTab = useCallback((tabId: string, updates: Partial<TabConfig>) => {
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab => 
        tab.id === tabId 
          ? { ...tab, ...updates, updatedAt: new Date() }
          : tab
      )
    }));
  }, []);

  const deleteTab = useCallback((tabId: string) => {
    setState(prev => {
      const remainingTabs = prev.tabs.filter(tab => tab.id !== tabId);
      
      // Can't delete the last tab
      if (remainingTabs.length === 0) {
        return prev;
      }

      // If we're deleting the active tab, switch to the first remaining tab
      const newActiveTabId = prev.activeTabId === tabId 
        ? remainingTabs[0].id 
        : prev.activeTabId;

      return {
        tabs: remainingTabs,
        activeTabId: newActiveTabId
      };
    });
  }, []);

  const switchTab = useCallback((tabId: string) => {
    if (state.tabs.some(tab => tab.id === tabId)) {
      setState(prev => ({
        ...prev,
        activeTabId: tabId
      }));
    }
  }, [state.tabs]);

  const reorderTabs = useCallback((newTabs: TabConfig[]) => {
    setState(prev => ({
      ...prev,
      tabs: newTabs
    }));
  }, []);

  // Save layout for active tab
  const saveLayout = useCallback((layout: { [key: string]: Layout[] }) => {
    if (activeTab) {
      updateTab(activeTab.id, { layout });
    }
  }, [activeTab, updateTab]);

  // Export/Import functionality
  const exportTabs = useCallback(() => {
    const exportData = {
      tabs: state.tabs,
      activeTabId: state.activeTabId,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `dashboard-tabs-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(link.href);
  }, [state]);

  const importTabs = useCallback((file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importData = JSON.parse(content);
          
          // Validate import data
          if (!importData.tabs || !Array.isArray(importData.tabs)) {
            throw new Error('Invalid import data');
          }
          
          // Convert date strings back to Date objects
          const tabs = importData.tabs.map((tab: any) => ({
            ...tab,
            createdAt: new Date(tab.createdAt),
            updatedAt: new Date(tab.updatedAt)
          }));
          
          setState({
            tabs,
            activeTabId: importData.activeTabId || tabs[0]?.id
          });
          
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }, []);

  // Reset to default
  const resetTabs = useCallback(() => {
    const defaultTab: TabConfig = {
      ...DEFAULT_TAB,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setState({
      tabs: [defaultTab],
      activeTabId: defaultTab.id
    });
  }, []);

  return {
    // State
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    activeTab,
    activeTabWidgets,
    
    // Actions
    createTab,
    updateTab,
    deleteTab,
    switchTab,
    reorderTabs,
    saveLayout,
    
    // Import/Export
    exportTabs,
    importTabs,
    resetTabs
  };
}