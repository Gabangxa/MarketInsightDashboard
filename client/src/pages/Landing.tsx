import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutGrid, 
  TrendingUp, 
  Bell, 
  Grid3x3, 
  ArrowRight, 
  Zap,
  Shield,
  Activity,
  BarChart3,
  Webhook,
  Eye
} from "lucide-react";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white overflow-hidden">
      {/* Animated Background Grid */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0b0f]" />
      </div>

      {/* Glow Effects */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed top-1/3 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 backdrop-blur-md bg-black/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 rounded-lg blur-sm opacity-50" />
                <div className="relative bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg">
                  <LayoutGrid className="h-5 w-5 text-white" data-testid="icon-logo" />
                </div>
              </div>
              <span className="text-lg font-semibold tracking-tight" data-testid="text-app-name">
                Market<span className="text-blue-400">Terminal</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                className="text-gray-300 hover:text-white hover:bg-white/5"
                onClick={() => setLocation("/login")}
                data-testid="button-login"
              >
                Log In
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-0"
                onClick={() => setLocation("/login")}
                data-testid="button-signup"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 pt-20 pb-16">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <Badge 
            variant="outline" 
            className="border-blue-500/30 bg-blue-500/10 text-blue-300 px-4 py-1.5"
            data-testid="badge-hero"
          >
            <Zap className="h-3 w-3 mr-1.5" />
            Real-Time Market Intelligence
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight" data-testid="text-hero-title">
            Your Professional
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Crypto Trading Terminal
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed" data-testid="text-hero-subtitle">
            Aggregate real-time data from multiple exchanges. Monitor order books, set smart alerts, and customize your workspace—all in one powerful dashboard.
          </p>
          
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-0 h-12 px-8 text-base"
              onClick={() => setLocation("/login")}
              data-testid="button-get-started"
            >
              Start Trading Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/10 bg-white/5 hover:bg-white/10 text-white h-12 px-8 text-base"
              onClick={() => setLocation("/login")}
              data-testid="button-demo"
            >
              View Demo
            </Button>
          </div>
        </div>

        {/* Terminal Preview */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div 
            className="relative rounded-xl overflow-hidden border border-white/10 bg-[#0d0f14]/80 backdrop-blur-xl shadow-2xl shadow-blue-500/10"
            data-testid="card-preview"
          >
            {/* Terminal Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-black/30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs text-gray-500 ml-2 font-mono">market-terminal — live</span>
              <div className="ml-auto flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-400 font-mono">connected</span>
              </div>
            </div>
            
            {/* Terminal Content */}
            <div className="p-4">
              <div className="grid grid-cols-12 gap-3">
                {/* Market Data Widget */}
                <div className="col-span-8 h-28 rounded-lg bg-gradient-to-br from-white/5 to-transparent border border-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 font-mono">MARKET DATA</span>
                    <Activity className="h-3 w-3 text-blue-400" />
                  </div>
                  <div className="flex items-end gap-4">
                    <div>
                      <div className="text-2xl font-bold font-mono text-white">$98,432.50</div>
                      <div className="text-xs text-green-400 font-mono">+2.34%</div>
                    </div>
                    <div className="flex-1 h-12 flex items-end gap-0.5">
                      {[40, 55, 45, 60, 50, 70, 65, 80, 75, 85, 70, 90].map((h, i) => (
                        <div 
                          key={i} 
                          className="flex-1 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t opacity-60"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Sentiment Widget */}
                <div className="col-span-4 h-28 rounded-lg bg-gradient-to-br from-white/5 to-transparent border border-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 font-mono">SENTIMENT</span>
                    <Eye className="h-3 w-3 text-cyan-400" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/10" />
                        <circle cx="18" cy="18" r="14" fill="none" stroke="url(#gradient)" strokeWidth="3" strokeDasharray="68 100" strokeLinecap="round" />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#22c55e" />
                            <stop offset="100%" stopColor="#3b82f6" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-green-400">68%</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      <div className="text-green-400">Bullish</div>
                      <div className="text-gray-500">24h trend</div>
                    </div>
                  </div>
                </div>
                
                {/* Order Book Widget */}
                <div className="col-span-4 h-32 rounded-lg bg-gradient-to-br from-white/5 to-transparent border border-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 font-mono">ORDER BOOK</span>
                    <BarChart3 className="h-3 w-3 text-purple-400" />
                  </div>
                  <div className="space-y-1">
                    {[65, 45, 80, 30].map((w, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <div className="w-8 text-xs text-green-400 font-mono text-right">{(98450 - i * 10).toFixed(0)}</div>
                        <div className="flex-1 h-3 bg-green-500/20 rounded-sm overflow-hidden">
                          <div className="h-full bg-green-500/50" style={{ width: `${w}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Alerts Widget */}
                <div className="col-span-4 h-32 rounded-lg bg-gradient-to-br from-white/5 to-transparent border border-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 font-mono">ALERTS</span>
                    <Bell className="h-3 w-3 text-yellow-400" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-gray-400">BTC &gt; $100k</span>
                      <span className="ml-auto text-gray-500">active</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                      <span className="text-gray-400">ETH &lt; $3,500</span>
                      <span className="ml-auto text-gray-500">active</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="text-gray-400">Keyword: pump</span>
                      <span className="ml-auto text-gray-500">active</span>
                    </div>
                  </div>
                </div>
                
                {/* Webhooks Widget */}
                <div className="col-span-4 h-32 rounded-lg bg-gradient-to-br from-white/5 to-transparent border border-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 font-mono">WEBHOOKS</span>
                    <Webhook className="h-3 w-3 text-orange-400" />
                  </div>
                  <div className="space-y-2">
                    <div className="p-2 rounded bg-white/5 text-xs">
                      <div className="text-orange-400 font-mono text-[10px]">TradingView</div>
                      <div className="text-gray-400 truncate">BTC breakout signal...</div>
                    </div>
                    <div className="p-2 rounded bg-white/5 text-xs">
                      <div className="text-blue-400 font-mono text-[10px]">Custom Bot</div>
                      <div className="text-gray-400 truncate">Volume spike detected</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-center text-sm text-gray-500 mt-4">
            Drag-and-drop widgets to create your perfect trading workspace
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 border-y border-white/5 bg-black/20 backdrop-blur-sm py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-white">2+</div>
              <div className="text-sm text-gray-500">Exchanges Supported</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">&lt;50ms</div>
              <div className="text-sm text-gray-500">Data Latency</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">8+</div>
              <div className="text-sm text-gray-500">Custom Widgets</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">24/7</div>
              <div className="text-sm text-gray-500">Real-Time Monitoring</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <Badge 
            variant="outline" 
            className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300 px-4 py-1.5 mb-4"
          >
            Features
          </Badge>
          <h2 className="text-4xl font-bold mb-4" data-testid="text-features-title">
            Everything You Need to Trade
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Stop juggling multiple tabs and platforms. Get everything you need to track, analyze, and act on market movements.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="bg-gradient-to-br from-white/5 to-transparent border-white/10 hover:border-blue-500/30 transition-colors" data-testid="card-feature-realtime">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
              <CardTitle className="text-white">Real-Time Data</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-400">
                Monitor prices, volume, and order books from Bybit and OKX at once. WebSocket-powered for instant updates.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/5 to-transparent border-white/10 hover:border-yellow-500/30 transition-colors" data-testid="card-feature-alerts">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/20 flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-yellow-400" />
              </div>
              <CardTitle className="text-white">Smart Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-400">
                Set price alerts for any symbol or keyword triggers in webhook messages. Never miss an opportunity.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/5 to-transparent border-white/10 hover:border-purple-500/30 transition-colors" data-testid="card-feature-widgets">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center mb-4">
                <Grid3x3 className="h-6 w-6 text-purple-400" />
              </div>
              <CardTitle className="text-white">Custom Layouts</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-400">
                Drag-and-drop widgets to design your perfect workspace. Layouts auto-save and persist across sessions.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/5 to-transparent border-white/10 hover:border-green-500/30 transition-colors" data-testid="card-feature-security">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-green-400" />
              </div>
              <CardTitle className="text-white">Secure & Private</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-400">
                Your data stays private. No API keys required for market data. Read-only access to exchanges.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/5 to-transparent border-white/10 hover:border-orange-500/30 transition-colors" data-testid="card-feature-webhooks">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20 flex items-center justify-center mb-4">
                <Webhook className="h-6 w-6 text-orange-400" />
              </div>
              <CardTitle className="text-white">Webhook Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-400">
                Receive alerts from TradingView, custom bots, or any service. Filter and search through message history.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/5 to-transparent border-white/10 hover:border-cyan-500/30 transition-colors" data-testid="card-feature-responsive">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center mb-4">
                <Activity className="h-6 w-6 text-cyan-400" />
              </div>
              <CardTitle className="text-white">Technical Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-400">
                Built-in correlation matrix, market sentiment, and technical indicators. All the tools pros use.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 rounded-2xl blur-xl" />
            <div className="relative bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-2xl p-12">
              <h2 className="text-3xl font-bold mb-4" data-testid="text-cta-title">
                Ready to Level Up Your Trading?
              </h2>
              <p className="text-gray-400 mb-8">
                Join traders who rely on Market Terminal for real-time market intelligence. Start for free today.
              </p>
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-0 h-12 px-8 text-base"
                onClick={() => setLocation("/login")}
                data-testid="button-cta-signup"
              >
                Create Your Free Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-black/30 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-1.5 rounded-lg">
                <LayoutGrid className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm text-gray-400">
                Market<span className="text-blue-400">Terminal</span>
              </span>
            </div>
            <p className="text-sm text-gray-500" data-testid="text-footer">
              2025 Market Terminal. Professional crypto market monitoring.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
