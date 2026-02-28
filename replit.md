# Real-Time Market Dashboard

## Overview
A modular, real-time cryptocurrency market monitoring dashboard that aggregates data from multiple exchanges (Bybit, OKX) via WebSocket connections. The application provides live price tracking, order book visualization, customizable alerts, webhook message monitoring, technical indicators, and a drag-and-drop widget-based interface with persistent user configurations. It includes a user authentication system. The business vision is to provide traders with a comprehensive, customizable, and reliable tool for real-time market analysis, enhancing decision-making and capitalizing on market opportunities.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React 18 and TypeScript, using Vite as a build tool, Wouter for routing, and TanStack Query for server state management. Tailwind CSS with shadcn/ui provides a dark mode-first design system inspired by professional trading terminals, using a custom color palette for data density and the Inter font for legibility.

The dashboard features a drag-and-drop widget system using `react-grid-layout`, supporting eight core widget types: Market Data, Order Book, Watchlist, Alerts, Webhook, Chart (TradingView lightweight-charts), Correlation Matrix, and Market Sentiment. The layout is responsive, with persistent user configurations stored in the database. A unified 12-column grid system is used across all breakpoints for consistent alignment, with vertical compaction and collision prevention.

Real-time data flows via WebSocket connections to the backend, pushing market data and order book updates. Data aggregation logic combines multiple exchange feeds. State management utilizes TanStack Query for API data, local state for UI, and custom hooks for WebSocket data and alert monitoring.

The alert system allows configuration of price and keyword alerts with trigger limits and a 5-second cooldown. Triggered alerts are displayed via custom-styled toast notifications. The Chart Widget integrates TradingView's lightweight-charts, supporting candlestick and line charts across various timeframes, fetching historical data from exchange REST APIs and overlaying real-time updates. The Correlation Matrix Widget calculates Pearson correlation coefficients between crypto pairs using aligned historical data and visualizes them in a color-coded heatmap. The Market Sentiment Widget displays the Fear & Greed Index from Alternative.me, with a visual gauge and classification badge.

### Backend Architecture
The backend is an Express.js server on Node.js with TypeScript, supporting HTTP and WebSocket connections. A custom `ExchangeWebSocketManager` handles multiple exchange connections, automatic reconnection with exponential backoff, and stateful order book reconstruction, emitting complete 50-level order books to clients.

RESTful endpoints manage CRUD operations for watchlist, alerts, webhooks, and dashboard configurations. A WebSocket endpoint `/ws` handles real-time data streams. Data storage uses PostgreSQL via Drizzle ORM with the Neon serverless driver, falling back to in-memory storage if unavailable. Data models include Users, WatchlistTokens, Alerts, WebhookMessages, and DashboardConfig, all persisting across sessions.

Exchange integration involves direct WebSocket connections to Bybit and OKX, with normalized data formats for ticker data and order book depth. Binance is currently geo-restricted.

### Data Storage Solutions
The database schema, implemented with PostgreSQL and Drizzle ORM, includes tables for `users`, `watchlist_tokens`, `alerts`, `webhook_messages`, and `dashboard_config`. UUID primary keys, JSONB columns for flexible data, and timestamps are utilized. Decimal precision is set for financial data.

### Authentication and Authorization
The system uses Passport.js with a Local strategy for username/password authentication. Sessions are managed via `express-session` with a PostgreSQL session store (`connect-pg-simple`) when `DATABASE_URL` is set, falling back to an in-memory store for local development. All user data is scoped by `userId` foreign keys. Public endpoints (e.g. `POST /api/webhook`) that lack an authenticated user fall back to a `PUBLIC_USER_ID` constant (`"public"`) for storage isolation. Shared WebSocket message types (`ServerMessage`, `ClientMessage`) and exchange constants (`SUPPORTED_EXCHANGES`, `SESSION_MAX_AGE_MS`) live in `shared/` and are imported by both the server and client.

## External Dependencies

**Exchange APIs:**
- Bybit WebSocket API (public streams)
- OKX WebSocket API (public streams)
- Alternative.me Crypto Fear & Greed Index API

**UI Component Libraries:**
- Radix UI primitives
- shadcn/ui
- react-grid-layout
- react-hot-toast
- TradingView's lightweight-charts
- date-fns

**Database & ORM:**
- Drizzle ORM
- Drizzle Kit
- @neondatabase/serverless (for PostgreSQL)
- Zod

**Build & Bundling:**
- Vite
- esbuild
- PostCSS
- Tailwind CSS
- Autoprefixer