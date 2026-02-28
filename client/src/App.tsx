import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";
import { useState } from "react";
import { LayoutGrid, LogOut, Loader2, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function Router({ activeView, onViewChange, isConnected }: { activeView: string; onViewChange: (view: string) => void; isConnected: boolean }) {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user, isLoading, logout } = useAuth();
  const [location] = useLocation();
  const [activeView, setActiveView] = useState('dashboard');
  const [isConnected, setIsConnected] = useState(true);

  const sidebarStyle = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3rem",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Initializing Terminal...</p>
      </div>
    );
  }

  if (!user) {
    if (location === "/login") {
      return <Login />;
    }
    return <Landing />;
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <SidebarProvider defaultOpen={true} style={sidebarStyle as React.CSSProperties}>
        <div className="flex h-screen w-full overflow-hidden">
          <AppSidebar 
            isConnected={isConnected}
            activeView={activeView}
            onViewChange={setActiveView}
          />
          <SidebarInset className="flex flex-col flex-1 overflow-hidden bg-transparent">
            <header className="flex items-center justify-between h-16 px-6 border-b border-white/5 bg-background/50 backdrop-blur-sm z-10">
              <div className="flex items-center gap-4">
                <SidebarTrigger data-testid="button-sidebar-toggle" className="-ml-2 hover:bg-white/5" />
                <div className="h-6 w-px bg-white/10 hidden md:block" />
                <div className="flex items-center gap-3">
                  <h1 className="text-sm font-semibold tracking-tight text-foreground/90">
                    {activeView.charAt(0).toUpperCase() + activeView.slice(1)}
                  </h1>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                   {isConnected ? (
                     <Wifi className="h-3 w-3 text-emerald-500" />
                   ) : (
                     <WifiOff className="h-3 w-3 text-red-500" />
                   )}
                   <span className="text-xs font-medium tabular-nums">
                     {isConnected ? "Live" : "Offline"}
                   </span>
                </div>

                <div className="h-6 w-px bg-white/10" />

                <div className="flex items-center gap-3">
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium leading-none">{user.username}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Pro Plan</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={logout}
                    data-testid="button-logout"
                    title="Logout"
                    className="hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </header>
            
            <main className="flex-1 overflow-hidden relative">
              {/* Decorative subtle gradient mesh for the background */}
              <div className="absolute top-0 left-0 w-full h-[500px] bg-primary/5 blur-[120px] pointer-events-none rounded-full translate-y-[-50%]" />
              
              <div className="h-full w-full relative z-0">
                <Router 
                  activeView={activeView}
                  onViewChange={setActiveView}
                  isConnected={isConnected}
                />
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <ErrorBoundary>
              <AuthenticatedApp />
            </ErrorBoundary>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
