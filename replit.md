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
- Five core widget types:
  - Market Data Widget: Real-time price, 24h change, volume display
  - Order Book Widget: Aggregated bid/ask depth visualization
  - Watchlist Widget: Token tracking with add/remove functionality
  - Alerts Widget: Price and keyword alert configuration
  - Webhook Widget: External message monitoring with filtering
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
- In-memory implementation (`MemStorage`) with Map-based storage
- Schema designed for PostgreSQL via Drizzle ORM
- Data models: Users, WatchlistTokens, Alerts, WebhookMessages, DashboardConfig

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

**Current Implementation:**
- In-memory storage active for development
- Drizzle schema fully defined and migration-ready
- Database configured via `DATABASE_URL` environment variable
- Migration directory: `./migrations`

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