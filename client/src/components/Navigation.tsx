import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutGrid, 
  Menu, 
  X,
  Settings,
  ChartBar,
  Bell,
  Webhook,
  Monitor,
  Search,
  HelpCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface NavigationProps {
  isConnected?: boolean;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  activeView?: string;
  onViewChange?: (view: string) => void;
}

const navigationItems = [
  { 
    id: 'dashboard',
    label: 'Dashboard', 
    icon: LayoutGrid, 
    description: 'Main trading dashboard with all widgets'
  },
  { 
    id: 'charts', 
    label: 'Charts', 
    icon: ChartBar, 
    description: 'Advanced charting and technical analysis',
    badge: 'Soon'
  },
  { 
    id: 'alerts', 
    label: 'Alerts', 
    icon: Bell, 
    description: 'Price alerts and notifications' 
  },
  { 
    id: 'webhooks', 
    label: 'Webhooks', 
    icon: Webhook, 
    description: 'Incoming webhook messages and integrations' 
  },
  { 
    id: 'monitoring', 
    label: 'Monitoring', 
    icon: Monitor, 
    description: 'System status and performance metrics',
    badge: 'Soon'
  },
];

export default function Navigation({ 
  isConnected = true, 
  onToggleFullscreen,
  isFullscreen = false,
  activeView = 'dashboard',
  onViewChange 
}: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleNavClick = (itemId: string) => {
    onViewChange?.(itemId);
    setIsOpen(false);
  };

  const NavContent = () => (
    <>
      <div className="space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-11",
                isActive && "bg-primary text-primary-foreground"
              )}
              onClick={() => handleNavClick(item.id)}
              disabled={item.badge === 'Soon'}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <Badge 
                      variant={item.badge === 'Soon' ? 'secondary' : 'default'}
                      className="ml-2 text-xs"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {item.description}
                </p>
              </div>
            </Button>
          );
        })}
      </div>
      
      <div className="mt-8 pt-4 border-t border-border space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-11"
          onClick={() => {/* Handle settings */}}
        >
          <Settings className="h-4 w-4" />
          <div className="flex-1 text-left">
            <span className="font-medium">Settings</span>
            <p className="text-xs text-muted-foreground">
              Dashboard preferences and configuration
            </p>
          </div>
        </Button>
        
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-11"
          onClick={() => {/* Handle help */}}
        >
          <HelpCircle className="h-4 w-4" />
          <div className="flex-1 text-left">
            <span className="font-medium">Help & Support</span>
            <p className="text-xs text-muted-foreground">
              Documentation and support resources
            </p>
          </div>
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Navigation Header */}
      <div className="hidden md:flex items-center justify-between p-4 bg-background border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <LayoutGrid className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Market Insight Dashboard</h1>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-red-500"
            )} />
            <span className="text-xs text-muted-foreground">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search - placeholder for future */}
          <Button
            variant="outline"
            size="sm"
            className="hidden lg:flex gap-2"
            disabled
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">Search...</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              Soon
            </Badge>
          </Button>

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleFullscreen}
              className="gap-2"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-4 w-4" />
                  <span className="hidden lg:inline">Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4" />
                  <span className="hidden lg:inline">Fullscreen</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-background border-b border-border">
        <div className="flex items-center gap-3">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-primary" />
                  Market Dashboard
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <NavContent />
              </div>
            </SheetContent>
          </Sheet>
          
          <h1 className="text-lg font-bold tracking-tight">Dashboard</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-red-500"
          )} />
          
          {/* Mobile Fullscreen Toggle */}
          {onToggleFullscreen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFullscreen}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Desktop Sidebar Navigation - for future multi-page layout */}
      <div className="hidden xl:block fixed left-0 top-0 h-full w-80 bg-sidebar border-r border-sidebar-border p-6 overflow-y-auto">
        <div className="flex items-center gap-3 mb-8">
          <LayoutGrid className="h-6 w-6 text-primary" />
          <div>
            <h2 className="font-bold text-lg">Market Dashboard</h2>
            <p className="text-xs text-muted-foreground">Real-time market insights</p>
          </div>
        </div>
        
        <NavContent />
        
        {/* Connection Status in Sidebar */}
        <div className="mt-8 pt-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 text-sm">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-red-500"
            )} />
            <span className="text-sidebar-foreground">
              {isConnected ? "Live Data Connected" : "Connection Lost"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}