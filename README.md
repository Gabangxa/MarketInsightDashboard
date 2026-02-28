# Real-Time Cryptocurrency Market Dashboard

A professional-grade, real-time cryptocurrency market monitoring dashboard that aggregates data from multiple exchanges via WebSocket connections. Built with React, TypeScript, and Express, featuring a customizable drag-and-drop interface with persistent configurations.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)

## Features

### Real-Time Market Data
- **Multi-Exchange Support**: Live data aggregated from Bybit and OKX via WebSocket
- **Order Book Visualization**: Adaptive bucketing with delta-merge for Bybit and snapshot for OKX
- **Visual Feedback**: Price changes highlighted with green/red flash animations

### Smart Alerts
- **Price Alerts**: Monitor symbols with customizable thresholds (`>`, `<`, `>=`, `<=`)
- **Keyword Alerts**: Scan webhook messages for specific keywords
- **Trigger Limits**: Set maximum trigger counts or unlimited alerts
- **Toast Notifications**: In-app notifications with custom styling

### Technical Analysis
- **Indicators**: SMA, EMA, RSI, MACD, Bollinger Bands, Stochastic, ATR, Williams %R
- **Fibonacci Retracement**: Auto-calculated swing high/low levels
- **Configurable Timeframes**: 1m – 1M bars with historical data from exchange APIs

### Watchlist Management
- Track cryptocurrency symbols across multiple exchanges simultaneously
- Persistent storage across sessions

### Webhook Integration
- Receive external messages via a public webhook endpoint (`POST /api/webhook`)
- Bookmark, filter, and search through message history

### Customizable Dashboard
- **Drag-and-Drop Widgets**: Rearrange with react-grid-layout
- **Persistent Layouts**: Layout saved automatically to the database
- **Tab System**: Create and manage multiple dashboard views

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, TypeScript, Vite, TanStack Query v5, Wouter |
| UI | Tailwind CSS, shadcn/ui (Radix UI), react-grid-layout, lightweight-charts, Recharts |
| Backend | Express.js, ws (WebSocket), Passport.js, express-session |
| Database | Drizzle ORM, Neon serverless PostgreSQL |
| Testing | Vitest (40 tests) |
| Tooling | ESLint, Prettier |

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (or use the in-memory fallback for local development)

### Installation

```bash
# Install dependencies
npm install

# Push the database schema
npm run db:push

# Start the development server
npm run dev
```

The app is available at `http://localhost:5000`.

### Environment Variables

Create a `.env` file (never commit it):

```env
DATABASE_URL=postgresql://user:password@host/dbname
SESSION_SECRET=a-long-random-secret-string
PORT=5000
```

> **Important:** If `SESSION_SECRET` is not set, the server will start with an insecure fallback and log a warning. Always set this in production.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the dev server (Express + Vite HMR) |
| `npm run build` | Production build (Vite + esbuild) |
| `npm start` | Serve the production build |
| `npm test` | Run unit tests (Vitest) |
| `npm run lint` | Check code with ESLint |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format all files with Prettier |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push schema changes to the database |

## API Reference

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Create an account |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Log out |
| GET  | `/api/auth/me` | Get current user |

### Watchlist *(requires auth)*
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/watchlist` | Get watchlist tokens |
| POST   | `/api/watchlist` | Add a token |
| DELETE | `/api/watchlist/:id` | Remove a token |

### Alerts *(requires auth)*
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/alerts` | Get alerts |
| POST   | `/api/alerts` | Create an alert |
| PATCH  | `/api/alerts/:id` | Update an alert |
| DELETE | `/api/alerts/:id` | Delete an alert |

### Webhooks
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/webhooks` | Get message history *(auth)* |
| POST   | `/api/webhook` | Receive a webhook *(public)* |
| PATCH  | `/api/webhooks/:id` | Bookmark a message *(auth)* |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/api/dashboard-config` | Get saved layout *(auth)* |
| POST | `/api/dashboard-config` | Save layout *(auth)* |

### WebSocket
Connect to `ws://localhost:5000/ws` (requires an authenticated session).

**Client → Server messages:**
```json
{ "type": "subscribe",   "symbol": "BTCUSDT", "exchanges": ["Bybit", "OKX"] }
{ "type": "unsubscribe", "symbol": "BTCUSDT" }
```

**Server → Client messages:**
```json
{ "type": "marketData",   "data": { ... } }
{ "type": "orderBook",    "data": { ... } }
{ "type": "systemStatus", "data": { ... } }
{ "type": "webhook",      "data": { ... } }
```

## Project Structure

```
├── client/
│   └── src/
│       ├── components/         # UI widgets and shared sub-components
│       │   ├── IndicatorCard.tsx
│       │   ├── IndicatorConfigDialog.tsx
│       │   ├── TabFormFields.tsx
│       │   ├── ErrorBoundary.tsx
│       │   └── ui/             # shadcn/ui base components
│       ├── hooks/
│       │   ├── useChartData.ts  # Chart history + real-time merge logic
│       │   └── useTabSystem.ts
│       ├── lib/
│       │   ├── technicalIndicators.ts
│       │   ├── marketAggregation.ts
│       │   ├── useMarketWebSocket.ts
│       │   └── *.test.ts        # Vitest unit tests
│       ├── contexts/            # AuthContext, SymbolContext
│       └── pages/               # Dashboard, Login, Landing
├── server/
│   ├── index.ts                 # App setup, session, Passport
│   ├── routes.ts                # All API routes + WebSocket server
│   ├── storage.ts               # IStorage interface, MemStorage, PostgresStorage
│   ├── websocket-manager.ts     # Exchange WebSocket connections (Bybit, OKX)
│   └── historical-data.ts       # Candle fetching
├── shared/
│   ├── schema.ts                # Drizzle ORM schema + Zod validators
│   ├── types.ts                 # Shared WebSocket message types (MarketData, etc.)
│   └── constants.ts             # SUPPORTED_EXCHANGES, SESSION_MAX_AGE_MS
└── vitest.config.ts
```

## Database Schema

```
users              (id, username, password)
watchlist_tokens   (id, user_id, symbol, exchanges, created_at)
alerts             (id, user_id, type, symbol, exchanges, condition,
                    value, keyword, triggered, last_triggered,
                    trigger_count, max_triggers, created_at)
webhook_messages   (id, user_id, source, message, payload, bookmarked, timestamp)
dashboard_config   (id, user_id, layout, updated_at)
```

## Exchange Support

| Exchange | Status | Notes |
|----------|--------|-------|
| Bybit | Active | Ticker + order book (delta/snapshot merge) |
| OKX | Active | Ticker + order book (books5 snapshot) |
| Binance | Disabled | Geo-blocked from some hosting providers (error 451) |

## Storage Pattern

The `IStorage` interface has two implementations selected at startup:

- **`PostgresStorage`** — used when `DATABASE_URL` is set
- **`MemStorage`** — in-memory fallback for local dev without a database

## License

MIT — feel free to use this as a foundation for your own market dashboard.
