# Real-Time Market Dashboard

## Overview

A modular, real-time cryptocurrency market monitoring dashboard that aggregates data from multiple exchanges (Binance, Bybit, OKX) via WebSocket connections. The application provides live price tracking, order book visualization, customizable alerts, webhook message monitoring, and a drag-and-drop widget-based interface with persistent user configurations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework Stack:**
- React 18 with TypeScript
- Vite as build tool and dev server
- Wouter for client-side routing
- TanStack Query (React Query) for server state management
- Tailwind CSS with shadcn/ui component library

**Design System:**
- Dark mode-first interface inspired by professional trading terminals (TradingView, Bloomberg)
- Custom color palette optimized for data density and real-time updates
- Semantic colors for market data (green for positive/buy, red for negative/sell, purple for bookmarks)
- Inter font for primary text, optimized for number legibility

**Widget System:**
- Drag-and-drop dashboard layout using react-grid-layout
- Six core widget types:
  - Market Data Widget: Real-time price, 24h change, volume display
  - Order Book Widget: Aggregated bid/ask depth visualization
  - Watchlist Widget: Token tracking with add/remove functionality
  - Alerts Widget: Price and keyword alert configuration
  - Webhook Widget: External message monitoring with filtering
  - Chart Widget: TradingView lightweight-charts integration with historical + real-time data (Oct 21, 2025)
- Responsive grid layout with persistent positioning via database storage
- **Optimized "Best Fit" Default Layout:**
  - Large screens (1200px+): 3-column trading terminal layout
    - Left: Watchlist sidebar (full height)
    - Center: Market Data + Order Book (stacked, order book taller for full bid/ask display)
    - Right: Webhook Messages + Alerts (stacked)
  - Medium screens (996-1199px): 2-column responsive layout
  - Small screens (<996px): Single column mobile-optimized layout
  - Order Book increased to 5 rows (400px) for complete spread visualization

**Real-Time Data Flow:**
- WebSocket connection to backend (`/ws` endpoint)
- Client subscribes to specific symbols and exchanges
- Market data and order book updates pushed to client
- Data aggregation logic combines multiple exchange feeds
- Visual flash feedback on price changes (green/red backgrounds)

**State Management Pattern:**
- TanStack Query for API data fetching and caching
- Local state for UI interactions (modals, filters)
- WebSocket state managed via custom `useMarketWebSocket` hook
- Alert monitoring via `useAlertMonitor` hook with toast notifications

**Alert System:**
- **Configuration UI:** Centered modal dialog (converted from side panel on Oct 19, 2025)
  - Performance optimized with conditional rendering to prevent re-renders when closed
  - Clear visibility with shadcn Dialog component
  - Editable alerts: Click Edit button (Pencil icon) to modify existing alerts (implemented Oct 19, 2025)
- **Alert Types:**
  - Price Alerts: Monitor symbol price against threshold (>, <, >=, <=)
  - Keyword Alerts: Scan webhook messages for specific keywords
- **Trigger Limits:** (implemented Oct 19, 2025)
  - `maxTriggers` field: Optional limit on how many times an alert can trigger
  - `triggerCount` field: Tracks number of times alert has triggered
  - null/empty maxTriggers = unlimited triggers
  - Alert stops triggering when triggerCount >= maxTriggers
  - UI displays "Triggers: X / Y" or "Triggers: X (unlimited)"
- **Alert Monitoring:**
  - `useAlertMonitor` hook checks alerts on every market data update
  - 5-second cooldown period prevents rapid re-triggering (implemented Oct 20, 2025)
  - Skips alerts that have reached their trigger limit
  - Increments triggerCount on each trigger
  - Marks alert as triggered=true only when limit is reached
  - **Race condition fix** (Oct 20, 2025): 
    - Persistent Set tracks alerts that reached their limit, surviving cache invalidations
    - Immediately updates in-memory alert object to `triggered=true` when limit reached
    - Cleanup mechanism removes deleted/reset alerts from tracking Sets
    - Prevents notifications from showing after trigger limit is reached
  - Custom styled toast notifications when alerts trigger (implemented Oct 19, 2025)
  - Alert status persisted (triggered, lastTriggered, triggerCount)
  - Timestamp conversion fix: Converts Date strings back to Date objects before database save (Oct 20, 2025)
- **Toast Notification Styling:**
  - Custom React components (`PriceAlertToast`, `KeywordAlertToast`)
  - Gradient backgrounds: red/orange for price alerts, blue/purple for keyword alerts
  - Full border styling: `border border-{color}/40` complies with design guidelines
  - Rounded corners (`rounded-md`) with proper iconography (TrendingUp/Down, Bell, AlertTriangle)
  - Clear information hierarchy: white text for important data, gray for secondary info
  - 8-second duration, top-right positioning via react-hot-toast
- **Important Limitation:** Price alerts only work for symbols with active WebSocket connections
  - Alerts require the symbol to be in the watchlist or actively monitored
  - Example: BTCUSDT alert works (default symbol), but ETHUSDT alert won't work unless ETHUSDT is added to watchlist first
  - This is by design to avoid unnecessary WebSocket connections

**Chart Widget & Historical Data (implemented Oct 21, 2025):**
- **Chart Library:** TradingView's lightweight-charts v4+ with official attribution watermark
- **Chart Types:** Candlestick and Line charts with smooth type transitions
- **Timeframes:** 1 minute, 5 minutes, 15 minutes, 1 hour, 4 hours, 1 day
- **Historical Data Fetching:**
  - On-demand REST API calls to Binance, Bybit, and OKX exchanges
  - `fetchHistoricalCandles()` utility aggregates OHLC data from multiple exchanges
  - Period selector: 1 hour, 4 hours, 24 hours, 1 week, 1 month
  - Dynamic candle count calculation based on period and timeframe
  - Historical data loads on component mount and configuration changes
- **Real-Time Integration:**
  - `CandleAggregator` class converts WebSocket tick data to OHLC candles across multiple timeframes
  - Historical candles merge with real-time updates via sorted Map<timestamp, Candle> instances
  - **Critical Map mutation fix (Oct 21):** Clone and sort Map instances before setState to trigger React updates
  - Real-time candles overlay on historical data without overriding past price action
- **Configuration Modal:**
  - `ChartConfigModal` allows changing symbol, timeframe, chart type, and historical period
  - Centered shadcn Dialog component with symbol/timeframe/period/type selectors
  - Triggers historical data refetch when configuration changes
- **Data Flow:**
  1. Dashboard mounts → `fetchHistoricalCandles(symbol, timeframe, period, exchanges)`
  2. Exchange REST APIs → Returns Map<timestamp, Candle> → Sort by timestamp → setState
  3. Real-time WebSocket ticks → CandleAggregator → Merge with historical (sorted)
  4. ChartWidget receives combined dataset → Renders via lightweight-charts API

### Backend Architecture

**Server Framework:**
- Express.js on Node.js
- TypeScript for type safety
- HTTP server with WebSocket upgrade support via `ws` library

**WebSocket Management:**
- Custom `ExchangeWebSocketManager` class handling multiple exchange connections
- Separate WebSocket connections per symbol per exchange
- Automatic reconnection logic with exponential backoff
- Ping/pong heartbeat for Bybit connections
- Bidirectional communication: client subscribes/unsubscribes to symbols
- **Stateful Order Book Reconstruction:**
  - Maintains local Map-based order book state per symbol
  - Snapshot handling: Initializes full order book from exchange snapshot
  - Delta handling: Applies incremental updates (size>0 = add/update, size=0 = delete)
  - Emits complete 50-level order books to clients on every update
  - State cleared on disconnect/reconnect for data integrity

**API Structure:**
- RESTful endpoints for CRUD operations:
  - `/api/watchlist` - Watchlist token management
  - `/api/alerts` - Alert configuration
  - `/api/webhooks` - Webhook message retrieval
  - `/api/dashboard-config` - Dashboard layout persistence
- WebSocket endpoint `/ws` for real-time data streams

**Data Storage Pattern:**
- Abstract `IStorage` interface for flexibility
- PostgreSQL implementation (`PostgresStorage`) using Drizzle ORM with Neon serverless driver
- Falls back to in-memory storage (`MemStorage`) if DATABASE_URL not available
- Data models: Users, WatchlistTokens, Alerts, WebhookMessages, DashboardConfig
- All data persists across sessions via PostgreSQL database

**Exchange Integration:**
- Direct WebSocket connections to public APIs:
  - **Binance**: ❌ Blocked (451 geo-restriction from Replit servers) - `wss://stream.binance.com:9443`
  - **Bybit**: ✅ Working - `wss://stream.bybit.com/v5/public/spot`
    - Ticker topic: `tickers.BTCUSDT`
    - Order book topic: `orderbook.50.BTCUSDT`
    - Requires ping/pong heartbeat every 20 seconds
  - **OKX**: ⏳ Configured - `wss://ws.okx.com:8443/ws/v5/public`
- Normalized data format across exchanges
- Real-time ticker data (price, volume, 24h change) and order book depth (bids/asks)
- Automatic reconnection with 5-second delay on disconnect

**Current Status (as of Oct 12, 2025):**
- Real-time BTC price from Bybit: ~$113,650 (accurate live data)
- Data flow: Exchange WebSocket → Backend Manager → Client WebSocket → React State → UI Widgets
- **Order book streaming successfully with complete 50-level depth**
  - Stateful delta reconstruction ensures all entries have valid size data
  - Proper handling of Bybit snapshot and delta update protocol
- Binance temporarily disabled due to geo-blocking (error 451)
- Bybit order book verified working with real-time delta updates

### Data Storage Solutions

**Database Schema (PostgreSQL + Drizzle ORM):**
- `users` - User authentication (username, password)
- `watchlist_tokens` - User-specific token watchlists with exchange selections
- `alerts` - Price and keyword alerts with trigger conditions
- `webhook_messages` - External messages with bookmark functionality
- `dashboard_config` - Persistent widget layout configurations (JSONB storage)

**Schema Design Patterns:**
- UUID primary keys with `gen_random_uuid()`
- JSONB columns for flexible data (exchange arrays, layout config, webhook payload)
- Timestamps for temporal tracking
- Boolean flags for states (triggered, bookmarked)
- Decimal precision for financial data (20,8)

**Current Implementation (Updated Oct 19, 2025):**
- ✅ PostgreSQL database active and persisting all data
- Drizzle ORM with Neon serverless driver for database operations
- Database configured via `DATABASE_URL` environment variable
- Schema pushed to database via `npm run db:push`
- All watchlist, alerts, webhook messages, and dashboard layouts persist across sessions

### Authentication and Authorization

**Current State:**
- User schema defined with username/password fields
- Default user ID (`"default-user"`) used for all operations
- No active authentication middleware implemented
- Session management prepared via `connect-pg-simple` package

**Intended Pattern:**
- Session-based authentication expected
- User-scoped data access via `userId` foreign keys
- All widgets and configurations tied to authenticated user

### External Dependencies

**Exchange APIs:**
- Binance WebSocket API (public streams)
- Bybit WebSocket API (public streams, requires ping/pong)
- OKX WebSocket API (public streams)
- No API keys required for public market data

**Development Tools:**
- Replit-specific plugins for development environment
- Runtime error overlay for debugging
- Cartographer for code navigation
- Development banner

**UI Component Library:**
- Radix UI primitives (30+ component packages)
- shadcn/ui configuration and theming
- react-grid-layout for dashboard customization
- react-hot-toast for notifications
- date-fns for timestamp formatting

**Database & ORM:**
- Drizzle ORM for type-safe database queries
- Drizzle Kit for schema migrations
- @neondatabase/serverless for PostgreSQL connection
- Zod for runtime schema validation (drizzle-zod integration)

**Build & Bundling:**
- Vite for frontend bundling
- esbuild for server-side bundling in production
- PostCSS with Tailwind and Autoprefixer
- TypeScript compilation with path aliases