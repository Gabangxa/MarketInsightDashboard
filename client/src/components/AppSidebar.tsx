import { LayoutGrid, ChartBar, Bell, Webhook, Monitor, Settings, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar';

interface AppSidebarProps {
  isConnected?: boolean;
  activeView?: string;
  onViewChange?: (view: string) => void;
}

const navigationItems = [
  { 
    id: 'dashboard',
    label: 'Dashboard', 
    icon: LayoutGrid, 
    description: 'Main trading dashboard'
  },
  { 
    id: 'charts', 
    label: 'Charts', 
    icon: ChartBar, 
    description: 'Technical analysis',
    badge: 'Soon'
  },
  { 
    id: 'alerts', 
    label: 'Alerts', 
    icon: Bell, 
    description: 'Price notifications' 
  },
  { 
    id: 'webhooks', 
    label: 'Webhooks', 
    icon: Webhook, 
    description: 'Webhook messages' 
  },
  { 
    id: 'monitoring', 
    label: 'Monitoring', 
    icon: Monitor, 
    description: 'System metrics',
    badge: 'Soon'
  },
];

export function AppSidebar({ isConnected = true, activeView = 'dashboard', onViewChange }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-4">
          <LayoutGrid className="h-6 w-6 text-primary" />
          <div>
            <h2 className="font-bold text-lg">Market Dashboard</h2>
            <p className="text-xs text-muted-foreground">Real-time market insights</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onViewChange?.(item.id)}
                      isActive={isActive}
                      disabled={item.badge === 'Soon'}
                      className="w-full"
                      data-testid={`nav-${item.id}`}
                    >
                      <Icon className="h-4 w-4" />
                      <div className="flex-1 flex items-center justify-between">
                        <span>{item.label}</span>
                        {item.badge && (
                          <Badge 
                            variant={item.badge === 'Soon' ? 'secondary' : 'default'}
                            className="ml-2 text-xs"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => {/* Handle settings */}} data-testid="button-settings">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => {/* Handle help */}} data-testid="button-help">
                  <HelpCircle className="h-4 w-4" />
                  <span>Help & Support</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 px-4 py-3 text-sm border-t">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-red-500"
          )} />
          <span className="text-muted-foreground">
            {isConnected ? "Live Data Connected" : "Connection Lost"}
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
