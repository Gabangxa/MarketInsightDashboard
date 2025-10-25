import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";
import { useState } from "react";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

function Router({ activeView, onViewChange, isConnected }: { activeView: string; onViewChange: (view: string) => void; isConnected: boolean }) {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [isConnected, setIsConnected] = useState(true);

  const sidebarStyle = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <SidebarProvider defaultOpen={false} style={sidebarStyle as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar 
                isConnected={isConnected}
                activeView={activeView}
                onViewChange={setActiveView}
              />
              <SidebarInset className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between p-4 border-b gap-4">
                  <div className="flex items-center gap-4">
                    <SidebarTrigger data-testid="button-sidebar-toggle" className="-ml-1" />
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
                </header>
                <main className="flex-1 overflow-hidden">
                  <Router 
                    activeView={activeView}
                    onViewChange={setActiveView}
                    isConnected={isConnected}
                  />
                </main>
              </SidebarInset>
            </div>
          </SidebarProvider>
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
