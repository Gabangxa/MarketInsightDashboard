import WebSocket from "ws";
import { EventEmitter } from "events";

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

// Local order book state for Bybit (maintains full snapshot + applies deltas)
interface OrderBookState {
  bids: Map<number, number>; // price -> size
  asks: Map<number, number>; // price -> size
}

export class ExchangeWebSocketManager extends EventEmitter {
  private binanceConnections: Map<string, WebSocket> = new Map();
  private bybitConnections: Map<string, WebSocket> = new Map();
  private okxConnections: Map<string, WebSocket> = new Map();
  private bybitPingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  // Maintain local order book state for Bybit
  private bybitOrderBooks: Map<string, OrderBookState> = new Map();

  constructor() {
    super();
  }

  subscribeToSymbol(symbol: string, exchanges: string[]) {
    // Temporarily disable Binance due to 451 geo-blocking
    // if (exchanges.includes("Binance")) {
    //   this.connectBinance(symbol);
    // }
    if (exchanges.includes("Bybit")) {
      this.connectBybit(symbol);
    }
    if (exchanges.includes("OKX")) {
      this.connectOKX(symbol);
    }
  }

  unsubscribeFromSymbol(symbol: string) {
    // Close Binance connection
    const binanceKey = `binance-${symbol}`;
    const binanceWs = this.binanceConnections.get(binanceKey);
    if (binanceWs) {
      binanceWs.close();
      this.binanceConnections.delete(binanceKey);
    }

    // Close Bybit connection and clear ping interval
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

    // Close OKX connection
    const okxKey = `okx-${symbol}`;
    const okxWs = this.okxConnections.get(okxKey);
    if (okxWs) {
      okxWs.close();
      this.okxConnections.delete(okxKey);
    }

    // Clear any scheduled reconnections for this symbol
    [binanceKey, bybitKey, okxKey].forEach(key => {
      const timeout = this.reconnectTimeouts.get(key);
      if (timeout) {
        clearTimeout(timeout);
        this.reconnectTimeouts.delete(key);
      }
    });
  }

  private connectBinance(symbol: string) {
    const key = `binance-${symbol}`;
    
    // Close existing connection for this symbol
    const existing = this.binanceConnections.get(key);
    if (existing?.readyState === WebSocket.OPEN) {
      existing.close();
    }

    const lowerSymbol = symbol.toLowerCase();
    // Use combined stream format
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${lowerSymbol}@ticker/${lowerSymbol}@depth5`;
    
    const ws = new WebSocket(wsUrl);
    this.binanceConnections.set(key, ws);

    ws.on("open", () => {
      console.log(`[Binance] Connected for ${symbol}`);
    });

    ws.on("message", (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.stream && message.data) {
          const streamData = message.data;
          
          if (message.stream.includes("@ticker")) {
            const marketData: MarketData = {
              exchange: "Binance",
              symbol: streamData.s,
              price: parseFloat(streamData.c),
              volume24h: parseFloat(streamData.q), // Quote volume in USDT
              priceChange24h: parseFloat(streamData.P),
              timestamp: Date.now(),
            };
            this.emit("marketData", marketData);
          } else if (message.stream.includes("@depth")) {
            const orderBook: OrderBookData = {
              exchange: "Binance",
              symbol: streamData.s || symbol.toUpperCase(),
              bids: streamData.bids.map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]),
              asks: streamData.asks.map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])]),
              timestamp: Date.now(),
            };
            this.emit("orderBook", orderBook);
          }
        }
      } catch (error) {
        console.error("[Binance] Message parse error:", error);
      }
    });

    ws.on("error", (error) => {
      console.error("[Binance] WebSocket error:", error);
    });

    ws.on("close", () => {
      console.log(`[Binance] Connection closed for ${symbol}, reconnecting...`);
      this.binanceConnections.delete(key);
      this.scheduleReconnect(`binance-${symbol}`, () => this.connectBinance(symbol));
    });
  }

  private connectBybit(symbol: string) {
    const key = `bybit-${symbol}`;
    
    // Close existing connection for this symbol
    const existing = this.bybitConnections.get(key);
    if (existing?.readyState === WebSocket.OPEN) {
      existing.close();
    }

    const wsUrl = "wss://stream.bybit.com/v5/public/spot";
    
    const ws = new WebSocket(wsUrl);
    this.bybitConnections.set(key, ws);

    ws.on("open", () => {
      console.log(`[Bybit] Connected for ${symbol}`);
      
      // Subscribe to ticker and orderbook
      // Bybit V5 WebSocket spot topics: tickers.BTCUSDT, orderbook.50.BTCUSDT
      const subscribeMsg = {
        op: "subscribe",
        args: [`tickers.${symbol}`, `orderbook.50.${symbol}`]
      };
      ws.send(JSON.stringify(subscribeMsg));

      // Start ping interval for this connection
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ op: "ping" }));
        }
      }, 20000);
      this.bybitPingIntervals.set(key, pingInterval);
    });

    ws.on("message", (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.topic && message.topic.startsWith("tickers.")) {
          const tickerData = message.data;
          const marketData: MarketData = {
            exchange: "Bybit",
            symbol: tickerData.symbol,
            price: parseFloat(tickerData.lastPrice),
            volume24h: parseFloat(tickerData.volume24h) * parseFloat(tickerData.lastPrice),
            priceChange24h: parseFloat(tickerData.price24hPcnt) * 100,
            timestamp: Date.now(),
          };
          this.emit("marketData", marketData);
        } else if (message.topic && message.topic.startsWith("orderbook.")) {
          const obData = message.data;
          const bookKey = `${symbol}`;
          
          // Initialize order book state if not exists
          if (!this.bybitOrderBooks.has(bookKey)) {
            this.bybitOrderBooks.set(bookKey, {
              bids: new Map(),
              asks: new Map()
            });
          }
          
          const bookState = this.bybitOrderBooks.get(bookKey)!;
          
          // Handle snapshot (initial full book)
          if (message.type === "snapshot") {
            console.log("[Bybit] Received snapshot for", symbol);
            bookState.bids.clear();
            bookState.asks.clear();
            
            obData.b.forEach((b: string[]) => {
              const price = parseFloat(b[0]);
              const size = parseFloat(b[1]);
              if (size > 0) bookState.bids.set(price, size);
            });
            
            obData.a.forEach((a: string[]) => {
              const price = parseFloat(a[0]);
              const size = parseFloat(a[1]);
              if (size > 0) bookState.asks.set(price, size);
            });
          } else {
            // Handle delta update
            obData.b.forEach((b: string[]) => {
              const price = parseFloat(b[0]);
              const size = parseFloat(b[1]);
              if (size > 0) {
                bookState.bids.set(price, size);
              } else {
                bookState.bids.delete(price); // size=0 means delete
              }
            });
            
            obData.a.forEach((a: string[]) => {
              const price = parseFloat(a[0]);
              const size = parseFloat(a[1]);
              if (size > 0) {
                bookState.asks.set(price, size);
              } else {
                bookState.asks.delete(price); // size=0 means delete
              }
            });
          }
          
          // Convert to sorted arrays (best prices first)
          const bids = Array.from(bookState.bids.entries())
            .sort(([a], [b]) => b - a) // Bids: highest first
            .slice(0, 50) // Top 50 levels
            .map(([price, size]) => [price, size] as [number, number]);
          
          const asks = Array.from(bookState.asks.entries())
            .sort(([a], [b]) => a - b) // Asks: lowest first
            .slice(0, 50) // Top 50 levels
            .map(([price, size]) => [price, size] as [number, number]);
          
          // Emit full reconstructed book
          if (bids.length > 0 || asks.length > 0) {
            const orderBook: OrderBookData = {
              exchange: "Bybit",
              symbol: obData.s,
              bids,
              asks,
              timestamp: Date.now(),
            };
            this.emit("orderBook", orderBook);
          }
        }
      } catch (error) {
        console.error("[Bybit] Message parse error:", error);
      }
    });

    ws.on("error", (error) => {
      console.error("[Bybit] WebSocket error:", error);
    });

    ws.on("close", () => {
      console.log(`[Bybit] Connection closed for ${symbol}, reconnecting...`);
      const pingInterval = this.bybitPingIntervals.get(key);
      if (pingInterval) {
        clearInterval(pingInterval);
        this.bybitPingIntervals.delete(key);
      }
      this.bybitConnections.delete(key);
      // Clear order book state on disconnect
      this.bybitOrderBooks.delete(symbol);
      this.scheduleReconnect(`bybit-${symbol}`, () => this.connectBybit(symbol));
    });
  }

  private connectOKX(symbol: string) {
    const key = `okx-${symbol}`;
    
    // Close existing connection for this symbol
    const existing = this.okxConnections.get(key);
    if (existing?.readyState === WebSocket.OPEN) {
      existing.close();
    }

    const wsUrl = "wss://ws.okx.com:8443/ws/v5/public";
    
    const ws = new WebSocket(wsUrl);
    this.okxConnections.set(key, ws);

    ws.on("open", () => {
      console.log(`[OKX] Connected for ${symbol}`);
      
      // Subscribe to ticker and orderbook
      const instId = symbol.replace("USDT", "-USDT");
      ws.send(JSON.stringify({
        op: "subscribe",
        args: [
          { channel: "tickers", instId },
          { channel: "books5", instId }
        ]
      }));
      console.log(`[OKX] Subscribed to ${instId}`);
    });

    ws.on("message", (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.data && message.arg) {
          const channelData = message.data[0];
          
          if (message.arg.channel === "tickers") {
            const marketData: MarketData = {
              exchange: "OKX",
              symbol: message.arg.instId.replace("-", ""),
              price: parseFloat(channelData.last),
              volume24h: parseFloat(channelData.vol24h) * parseFloat(channelData.last),
              priceChange24h: parseFloat(channelData.sodUtc0) / parseFloat(channelData.sodUtc8) * 100,
              timestamp: Date.now(),
            };
            this.emit("marketData", marketData);
          } else if (message.arg.channel === "books5") {
            const orderBook: OrderBookData = {
              exchange: "OKX",
              symbol: message.arg.instId.replace("-", ""),
              bids: channelData.bids.map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]),
              asks: channelData.asks.map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])]),
              timestamp: Date.now(),
            };
            this.emit("orderBook", orderBook);
          }
        }
      } catch (error) {
        console.error("[OKX] Message parse error:", error);
      }
    });

    ws.on("error", (error) => {
      console.error("[OKX] WebSocket error:", error);
    });

    ws.on("close", () => {
      console.log(`[OKX] Connection closed for ${symbol}, reconnecting...`);
      this.okxConnections.delete(key);
      this.scheduleReconnect(`okx-${symbol}`, () => this.connectOKX(symbol));
    });
  }

  private scheduleReconnect(key: string, reconnectFn: () => void) {
    const existing = this.reconnectTimeouts.get(key);
    if (existing) {
      clearTimeout(existing);
    }

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
