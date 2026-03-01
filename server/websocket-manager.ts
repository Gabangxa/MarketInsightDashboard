import WebSocket from "ws";
import { EventEmitter } from "events";
import type { MarketData, OrderBookData, SystemStatus } from "@shared/types";
import { SUPPORTED_EXCHANGES } from "@shared/constants";
import { fundingRateManager } from "./funding-rate-manager";

export type { MarketData, OrderBookData, SystemStatus };

interface OrderBookState {
  bids: Map<number, number>;
  asks: Map<number, number>;
}

export class ExchangeWebSocketManager extends EventEmitter {
  private binanceConnections: Map<string, WebSocket> = new Map();
  private bybitConnections: Map<string, WebSocket> = new Map();
  private okxConnections: Map<string, WebSocket> = new Map();
  private bybitPingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private bybitOrderBooks: Map<string, OrderBookState> = new Map();

  constructor() {
    super();
  }

  subscribeToSymbol(symbol: string, exchanges: string[]) {
    if (exchanges.includes(SUPPORTED_EXCHANGES[0])) {
      this.connectBybit(symbol);
    }
    if (exchanges.includes(SUPPORTED_EXCHANGES[1])) {
      this.connectOKX(symbol);
    }
    fundingRateManager.subscribeToSymbol(symbol);
  }

  unsubscribeFromSymbol(symbol: string) {
    const binanceKey = `binance-${symbol}`;
    const binanceWs = this.binanceConnections.get(binanceKey);
    if (binanceWs) {
      binanceWs.close();
      this.binanceConnections.delete(binanceKey);
    }

    const bybitKey = `bybit-${symbol}`;
    const bybitWs = this.bybitConnections.get(bybitKey);
    if (bybitWs) {
      bybitWs.close();
      this.bybitConnections.delete(bybitKey);
      const pingInterval = this.bybitPingIntervals.get(bybitKey);
      if (pingInterval) {
        clearInterval(pingInterval);
        this.bybitPingIntervals.delete(bybitKey);
      }
    }

    const okxKey = `okx-${symbol}`;
    const okxWs = this.okxConnections.get(okxKey);
    if (okxWs) {
      okxWs.close();
      this.okxConnections.delete(okxKey);
    }

    [binanceKey, bybitKey, okxKey].forEach(key => {
      const timeout = this.reconnectTimeouts.get(key);
      if (timeout) {
        clearTimeout(timeout);
        this.reconnectTimeouts.delete(key);
      }
    });

    fundingRateManager.unsubscribeFromSymbol(symbol);
  }

  private connectBinance(symbol: string) {
    const key = `binance-${symbol}`;
    const existing = this.binanceConnections.get(key);
    if (existing?.readyState === WebSocket.OPEN) existing.close();

    const lowerSymbol = symbol.toLowerCase();
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${lowerSymbol}@ticker/${lowerSymbol}@depth5`;
    const ws = new WebSocket(wsUrl);
    this.binanceConnections.set(key, ws);

    ws.on("open", () => console.log(`[Binance] Connected for ${symbol}`));

    ws.on("message", (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.stream && message.data) {
          const streamData = message.data;
          if (message.stream.includes("@ticker")) {
            this.emit("marketData", {
              exchange: "Binance",
              symbol: streamData.s,
              price: parseFloat(streamData.c),
              volume24h: parseFloat(streamData.q),
              priceChange24h: parseFloat(streamData.P),
              timestamp: Date.now(),
            } as MarketData);
          } else if (message.stream.includes("@depth")) {
            this.emit("orderBook", {
              exchange: "Binance",
              symbol: streamData.s || symbol.toUpperCase(),
              bids: streamData.bids.map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]),
              asks: streamData.asks.map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])]),
              timestamp: Date.now(),
            } as OrderBookData);
          }
        }
      } catch (error) {
        console.error("[Binance] Message parse error:", error);
      }
    });

    ws.on("error", (error) => console.error("[Binance] WebSocket error:", error));
    ws.on("close", () => {
      console.log(`[Binance] Connection closed for ${symbol}, reconnecting...`);
      this.binanceConnections.delete(key);
      this.scheduleReconnect(`binance-${symbol}`, () => this.connectBinance(symbol));
    });
  }

  private connectBybit(symbol: string) {
    const key = `bybit-${symbol}`;
    const existing = this.bybitConnections.get(key);
    if (existing?.readyState === WebSocket.OPEN) existing.close();

    const ws = new WebSocket("wss://stream.bybit.com/v5/public/spot");
    this.bybitConnections.set(key, ws);

    ws.on("open", () => {
      console.log(`[Bybit] Connected for ${symbol}`);
      ws.send(JSON.stringify({
        op: "subscribe",
        args: [`tickers.${symbol}`, `orderbook.50.${symbol}`],
      }));
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: "ping" }));
      }, 20000);
      this.bybitPingIntervals.set(key, pingInterval);
    });

    ws.on("message", (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.topic?.startsWith("tickers.")) {
          const t = message.data;
          this.emit("marketData", {
            exchange: "Bybit",
            symbol: t.symbol,
            price: parseFloat(t.lastPrice),
            volume24h: parseFloat(t.volume24h) * parseFloat(t.lastPrice),
            priceChange24h: parseFloat(t.price24hPcnt) * 100,
            timestamp: Date.now(),
          } as MarketData);
        } else if (message.topic?.startsWith("orderbook.")) {
          const obData = message.data;
          const bookKey = symbol;
          if (!this.bybitOrderBooks.has(bookKey)) {
            this.bybitOrderBooks.set(bookKey, { bids: new Map(), asks: new Map() });
          }
          const bookState = this.bybitOrderBooks.get(bookKey)!;

          if (message.type === "snapshot") {
            bookState.bids.clear();
            bookState.asks.clear();
            obData.b.forEach((b: string[]) => {
              const size = parseFloat(b[1]);
              if (size > 0) bookState.bids.set(parseFloat(b[0]), size);
            });
            obData.a.forEach((a: string[]) => {
              const size = parseFloat(a[1]);
              if (size > 0) bookState.asks.set(parseFloat(a[0]), size);
            });
          } else {
            obData.b.forEach((b: string[]) => {
              const price = parseFloat(b[0]);
              const size = parseFloat(b[1]);
              if (size > 0) bookState.bids.set(price, size);
              else bookState.bids.delete(price);
            });
            obData.a.forEach((a: string[]) => {
              const price = parseFloat(a[0]);
              const size = parseFloat(a[1]);
              if (size > 0) bookState.asks.set(price, size);
              else bookState.asks.delete(price);
            });
          }

          const bids = Array.from(bookState.bids.entries())
            .sort(([a], [b]) => b - a).slice(0, 50)
            .map(([price, size]) => [price, size] as [number, number]);
          const asks = Array.from(bookState.asks.entries())
            .sort(([a], [b]) => a - b).slice(0, 50)
            .map(([price, size]) => [price, size] as [number, number]);

          if (bids.length > 0 || asks.length > 0) {
            this.emit("orderBook", {
              exchange: "Bybit",
              symbol: obData.s,
              bids,
              asks,
              timestamp: Date.now(),
            } as OrderBookData);
          }
        }
      } catch (error) {
        console.error("[Bybit] Message parse error:", error);
      }
    });

    ws.on("error", (error) => console.error("[Bybit] WebSocket error:", error));
    ws.on("close", () => {
      console.log(`[Bybit] Connection closed for ${symbol}, reconnecting...`);
      const pingInterval = this.bybitPingIntervals.get(key);
      if (pingInterval) {
        clearInterval(pingInterval);
        this.bybitPingIntervals.delete(key);
      }
      this.bybitConnections.delete(key);
      this.bybitOrderBooks.delete(symbol);
      this.scheduleReconnect(`bybit-${symbol}`, () => this.connectBybit(symbol));
    });
  }

  private connectOKX(symbol: string) {
    const key = `okx-${symbol}`;
    const existing = this.okxConnections.get(key);
    if (existing?.readyState === WebSocket.OPEN) existing.close();

    const ws = new WebSocket("wss://ws.okx.com:8443/ws/v5/public");
    this.okxConnections.set(key, ws);

    ws.on("open", () => {
      console.log(`[OKX] Connected for ${symbol}`);
      const instId = symbol.replace("USDT", "-USDT");
      ws.send(JSON.stringify({
        op: "subscribe",
        args: [
          { channel: "tickers", instId },
          { channel: "books5", instId },
        ],
      }));
      console.log(`[OKX] Subscribed to ${instId}`);
    });

    ws.on("message", (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.data && message.arg) {
          const channelData = message.data[0];
          if (message.arg.channel === "tickers") {
            this.emit("marketData", {
              exchange: "OKX",
              symbol: message.arg.instId.replace("-", ""),
              price: parseFloat(channelData.last),
              volume24h: parseFloat(channelData.vol24h) * parseFloat(channelData.last),
              priceChange24h: parseFloat(channelData.sodUtc0) / parseFloat(channelData.sodUtc8) * 100,
              timestamp: Date.now(),
            } as MarketData);
          } else if (message.arg.channel === "books5") {
            this.emit("orderBook", {
              exchange: "OKX",
              symbol: message.arg.instId.replace("-", ""),
              bids: channelData.bids.map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]),
              asks: channelData.asks.map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])]),
              timestamp: Date.now(),
            } as OrderBookData);
          }
        }
      } catch (error) {
        console.error("[OKX] Message parse error:", error);
      }
    });

    ws.on("error", (error) => console.error("[OKX] WebSocket error:", error));
    ws.on("close", () => {
      console.log(`[OKX] Connection closed for ${symbol}, reconnecting...`);
      this.okxConnections.delete(key);
      this.scheduleReconnect(`okx-${symbol}`, () => this.connectOKX(symbol));
    });
  }

  private scheduleReconnect(key: string, reconnectFn: () => void) {
    const existing = this.reconnectTimeouts.get(key);
    if (existing) clearTimeout(existing);
    const timeout = setTimeout(() => {
      reconnectFn();
      this.reconnectTimeouts.delete(key);
    }, 5000);
    this.reconnectTimeouts.set(key, timeout);
  }

  disconnect() {
    this.binanceConnections.forEach(ws => ws.close());
    this.binanceConnections.clear();
    this.bybitConnections.forEach(ws => ws.close());
    this.bybitConnections.clear();
    this.okxConnections.forEach(ws => ws.close());
    this.okxConnections.clear();
    this.bybitPingIntervals.forEach(interval => clearInterval(interval));
    this.bybitPingIntervals.clear();
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    this.reconnectTimeouts.clear();
  }
}

export const wsManager = new ExchangeWebSocketManager();
