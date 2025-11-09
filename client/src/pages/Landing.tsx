import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, TrendingUp, Bell, Grid3x3, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-6 w-6 text-primary" data-testid="icon-logo" />
              <span className="text-xl font-semibold" data-testid="text-app-name">
                Market Insight Dashboard
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setLocation("/login")}
                data-testid="button-login"
              >
                Log In
              </Button>
              <Button
                variant="default"
                onClick={() => setLocation("/login")}
                data-testid="button-signup"
              >
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <Badge variant="outline" className="mb-2" data-testid="badge-hero">
            Real-Time Market Intelligence
          </Badge>
          <h1 className="text-5xl font-bold tracking-tight" data-testid="text-hero-title">
            Your All-In-One Crypto Market Terminal
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-hero-subtitle">
            Aggregate real-time data, visualize order books, and automate alerts from all your exchanges in one customizable dashboard.
          </p>
          <div className="pt-4">
            <Button
              size="lg"
              onClick={() => setLocation("/login")}
              data-testid="button-get-started"
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          <div className="mt-12">
            <Card className="max-w-3xl mx-auto overflow-hidden" data-testid="card-preview">
              <CardContent className="p-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-24 rounded-md bg-primary/10 border border-primary/20" />
                  <div className="h-24 rounded-md bg-primary/10 border border-primary/20" />
                  <div className="h-24 rounded-md bg-primary/10 border border-primary/20" />
                  <div className="h-32 col-span-2 rounded-md bg-primary/10 border border-primary/20" />
                  <div className="h-32 rounded-md bg-primary/10 border border-primary/20" />
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Drag-and-drop widgets to create your perfect trading workspace
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4" data-testid="text-features-title">
            Finally, All Your Tools in One Place
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Stop juggling multiple tabs and platforms. Get everything you need to track, analyze, and act on market movements.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card data-testid="card-feature-realtime">
            <CardHeader>
              <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Aggregate Real-Time Data</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Monitor prices, volume, and order books from multiple exchanges (Bybit, OKX) at once. No more tab-switching.
              </CardDescription>
            </CardContent>
          </Card>

          <Card data-testid="card-feature-alerts">
            <CardHeader>
              <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Powerful, Automated Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Set price alerts for any symbol or keyword triggers in webhook messages. Never miss an opportunity again.
              </CardDescription>
            </CardContent>
          </Card>

          <Card data-testid="card-feature-widgets">
            <CardHeader>
              <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                <Grid3x3 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Customizable Widget Layout</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Drag-and-drop widgets to design your perfect workspace. Market data, charts, watchlists, and more—all in one view.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold" data-testid="text-cta-title">
            Ready to Level Up Your Trading?
          </h2>
          <p className="text-muted-foreground">
            Join traders who rely on Market Insight Dashboard for real-time market intelligence.
          </p>
          <Button
            size="lg"
            onClick={() => setLocation("/login")}
            data-testid="button-cta-signup"
          >
            Create Your Free Account
          </Button>
        </div>
      </section>

      <footer className="border-t mt-20">
        <div className="container mx-auto px-6 py-8 text-center text-sm text-muted-foreground">
          <p data-testid="text-footer">
            © 2025 Market Insight Dashboard. Professional crypto market monitoring.
          </p>
        </div>
      </footer>
    </div>
  );
}
