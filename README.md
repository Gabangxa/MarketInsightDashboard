# Real-Time Cryptocurrency Market Dashboard

A professional-grade, real-time cryptocurrency market monitoring dashboard that aggregates data from multiple exchanges via WebSocket connections. Built with React, TypeScript, and Express, featuring a customizable drag-and-drop interface with persistent configurations.

![Dashboard Preview](https://img.shields.io/badge/status-active-success)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)

## Features

### 📊 Real-Time Market Data
- **Multi-Exchange Support**: Aggregates data from Bybit, with Binance and OKX support configured
- **WebSocket Streaming**: Live price updates, 24-hour changes, and volume tracking
- **Order Book Visualization**: Adaptive bucketing algorithm for clean bid/ask depth display
- **Visual Feedback**: Price changes highlighted with green/red flash animations

### 🎯 Smart Alerts
- **Price Alerts**: Monitor symbols with customizable thresholds (>, <, >=, <=)
- **Keyword Alerts**: Scan webhook messages for specific keywords
- **Trigger Limits**: Set maximum trigger counts or unlimited alerts
- **Toast Notifications**: Beautiful gradient notifications with custom styling
- **Editable Alerts**: Modify existing alerts with pre-filled data

### 📌 Watchlist Management
- Track up to 10 cryptocurrency symbols simultaneously
- Multi-exchange selection per symbol
- Persistent storage across sessions
- Quick add/remove functionality

### 🔗 Webhook Integration
- Receive external messages via webhook endpoint
- Bookmark important messages
- Filter and search through message history
- Real-time message display

### 🎨 Customizable Dashboard
- **Drag-and-Drop Widgets**: Rearrange dashboard layout with react-grid-layout
- **Responsive Design**: Optimized layouts for desktop, tablet, and mobile
- **Persistent Layouts**: Save your preferred widget arrangement
- **Dark Mode**: Professional trading terminal aesthetic

### 💾 Data Persistence
- PostgreSQL database with Drizzle ORM
- All configurations persist across sessions
- Automatic fallback to in-memory storage

## Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite (build tool & dev server)
- TanStack Query (React Query v5)
- Tailwind CSS + shadcn/ui components
- react-grid-layout (drag-and-drop)
- Wouter (routing)

**Backend:**
- Express.js on Node.js
- WebSocket (ws library)
- TypeScript
- Drizzle ORM with Neon serverless PostgreSQL

**Infrastructure:**
- PostgreSQL database (Neon)
- Real-time WebSocket connections
- RESTful API endpoints

## Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (automatically provisioned on Replit)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up the database:**
   ```bash
   npm run db:push
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## Usage

### Adding Symbols to Watchlist

1. Click the **Add Token** button in the Watchlist widget
2. Enter the symbol (e.g., `BTCUSDT`, `ETHUSDT`)
3. Select one or more exchanges (Bybit recommended)
4. Click **Save**

### Creating Price Alerts

1. Click **Add Alert** in the Alerts widget
2. Select **Price Alert** type
3. Configure:
   - Symbol (must be in watchlist or actively monitored)
   - Exchange(s)
   - Condition (>, <, >=, <=)
   - Target price
   - Max triggers (optional, leave empty for unlimited)
4. Click **Save Alert**

### Creating Keyword Alerts

1. Click **Add Alert** in the Alerts widget
2. Select **Keyword Alert** type
3. Configure:
   - Keyword to monitor
   - Exchange(s)
   - Max triggers (optional)
4. Click **Save Alert**

### Editing Alerts

1. Click the **Edit** (pencil) icon on any alert
2. Modify the configuration
3. Click **Save Alert** to update

### Customizing Dashboard Layout

1. Drag widgets by their headers to rearrange
2. Resize widgets using the drag handle in the bottom-right corner
3. Your layout is automatically saved to the database

## API Endpoints

### Watchlist
- `GET /api/watchlist` - Get user's watchlist tokens
- `POST /api/watchlist` - Add a new token
- `DELETE /api/watchlist/:id` - Remove a token

### Alerts
- `GET /api/alerts` - Get user's alerts
- `POST /api/alerts` - Create a new alert
- `PATCH /api/alerts/:id` - Update an alert
- `DELETE /api/alerts/:id` - Delete an alert

### Webhooks
- `GET /api/webhooks` - Get webhook messages
- `POST /api/webhook` - Receive external webhook
- `PATCH /api/webhooks/:id` - Update message (bookmark)

### Dashboard
- `GET /api/dashboard-config` - Get saved layout
- `POST /api/dashboard-config` - Save layout configuration

### WebSocket
- `ws://localhost:5000/ws` - Real-time market data stream

## Database Schema

```sql
-- Users (authentication ready)
users (id, username, password)

-- Watchlist tokens
watchlist_tokens (id, user_id, symbol, exchanges, created_at)

-- Alerts configuration
alerts (id, user_id, type, symbol, exchanges, condition, value, 
        keyword, triggered, last_triggered, trigger_count, 
        max_triggers, created_at)

-- Webhook messages
webhook_messages (id, user_id, source, message, payload, 
                  bookmarked, timestamp)

-- Dashboard configuration
dashboard_config (id, user_id, layout, updated_at)
```

## Architecture

### WebSocket Flow
```
Exchange WebSocket → Backend Manager → Client WebSocket → React State → UI Widgets
```

### Data Flow
1. Client subscribes to symbols via WebSocket
2. Backend maintains connections to exchange APIs
3. Market data aggregated from multiple exchanges
4. Real-time updates pushed to connected clients
5. Alert monitor checks conditions on every update

### Storage Pattern
- Abstract `IStorage` interface for flexibility
- `PostgresStorage` implementation using Drizzle ORM
- Fallback to `MemStorage` for development without database

## Exchange Support

| Exchange | Status | WebSocket URL |
|----------|--------|---------------|
| Bybit | ✅ Working | `wss://stream.bybit.com/v5/public/spot` |
| Binance | ❌ Geo-blocked | `wss://stream.binance.com:9443` |
| OKX | ⏳ Configured | `wss://ws.okx.com:8443/ws/v5/public` |

**Note:** Binance is currently blocked due to geo-restrictions from Replit servers.

## Known Limitations

1. **Price Alerts**: Only work for symbols with active WebSocket connections (must be in watchlist or actively monitored)
2. **Exchange Availability**: Binance blocked from Replit servers (error 451)
3. **Default User**: Currently uses a single default user ID (`"default-user"`)

## Development

### Project Structure
```
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/   # React components & widgets
│   │   ├── lib/         # Utilities & hooks
│   │   └── pages/       # Page components
├── server/              # Backend Express application
│   ├── routes.ts        # API routes
│   ├── storage.ts       # Database layer
│   └── websocket.ts     # WebSocket manager
├── shared/              # Shared types & schemas
│   └── schema.ts        # Drizzle schema & Zod validation
└── migrations/          # Database migrations
```

### Running Database Migrations

```bash
# Push schema changes to database
npm run db:push

# Force push (if warnings about data loss)
npm run db:push --force
```

### Environment Variables

```env
DATABASE_URL=postgresql://...    # PostgreSQL connection string
SESSION_SECRET=...               # Session encryption key
```

## Contributing

This is a personal project, but suggestions and feedback are welcome!

## License

MIT License - feel free to use this project as a foundation for your own cryptocurrency dashboard.

---

**Built with ❤️ using Replit**
