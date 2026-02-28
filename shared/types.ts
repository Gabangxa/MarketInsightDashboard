/**
 * Shared types used by both the server (websocket-manager) and the client
 * (useMarketWebSocket). Keep this file free of Node.js or browser-only imports.
 */

export interface MarketData {
  exchange: string;
  symbol: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  timestamp: number;
}

export interface OrderBookData {
  exchange: string;
  symbol: string;
  bids: Array<[number, number]>; // [price, size]
  asks: Array<[number, number]>; // [price, size]
  timestamp: number;
}

export interface SystemStatus {
  exchange: string;
  status: "connected" | "disconnected" | "reconnecting";
  latency: number;
  lastUpdate: number;
}

export interface WebhookMessage {
  id: string;
  source: string;
  message: string;
  payload?: Record<string, unknown>;
  bookmarked: boolean;
  timestamp: Date | string;
}

/** Discriminated union for all messages broadcast over the WebSocket. */
export type ServerMessage =
  | { type: "marketData"; data: MarketData }
  | { type: "orderBook"; data: OrderBookData }
  | { type: "systemStatus"; data: SystemStatus }
  | { type: "webhook"; data: WebhookMessage };

/** Discriminated union for messages sent from the client to the server. */
export type ClientMessage =
  | { type: "subscribe"; symbol: string; exchanges: string[] }
  | { type: "unsubscribe"; symbol: string };
