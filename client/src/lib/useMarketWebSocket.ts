import { useEffect, useRef, useState, useCallback } from "react";

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
  bids: Array<[number, number]>;
  asks: Array<[number, number]>;
  timestamp: number;
}

export interface WebhookMessage {
  id: string;
  source: string;
  message: string;
  payload?: any;
  bookmarked: boolean;
  timestamp: Date;
}

interface UseMarketWebSocketReturn {
  marketData: Map<string, Map<string, MarketData>>; // symbol -> exchange -> data
  orderBooks: Map<string, Map<string, OrderBookData>>; // symbol -> exchange -> data
  newWebhook: WebhookMessage | null;
  isConnected: boolean;
  subscribe: (symbol: string, exchanges: string[]) => void;
  unsubscribe: (symbol: string) => void;
}

export function useMarketWebSocket(): UseMarketWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [marketData, setMarketData] = useState<Map<string, Map<string, MarketData>>>(new Map());
  const [orderBooks, setOrderBooks] = useState<Map<string, Map<string, OrderBookData>>>(new Map());
  const [newWebhook, setNewWebhook] = useState<WebhookMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const subscriptionsRef = useRef<Map<string, string[]>>(new Map()); // symbol -> exchanges

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      
      // Re-subscribe to all symbols after reconnection
      subscriptionsRef.current.forEach((exchanges, symbol) => {
        ws.send(JSON.stringify({
          type: "subscribe",
          symbol,
          exchanges,
        }));
      });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "marketData") {
          const data: MarketData = message.data;
          setMarketData(prev => {
            const newMap = new Map(prev);
            const symbolData = newMap.get(data.symbol) || new Map();
            symbolData.set(data.exchange, data);
            newMap.set(data.symbol, symbolData);
            return newMap;
          });
        } else if (message.type === "orderBook") {
          const data: OrderBookData = message.data;
          setOrderBooks(prev => {
            const newMap = new Map(prev);
            const symbolData = newMap.get(data.symbol) || new Map();
            symbolData.set(data.exchange, data);
            newMap.set(data.symbol, symbolData);
            return newMap;
          });
        } else if (message.type === "webhook") {
          const data: WebhookMessage = message.data;
          setNewWebhook(data);
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected, reconnecting...");
      setIsConnected(false);
      
      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const subscribe = useCallback((symbol: string, exchanges: string[]) => {
    // Store subscription for reconnection
    subscriptionsRef.current.set(symbol, exchanges);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "subscribe",
        symbol,
        exchanges,
      }));
    }
  }, []);

  const unsubscribe = useCallback((symbol: string) => {
    subscriptionsRef.current.delete(symbol);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "unsubscribe",
        symbol,
      }));
    }
  }, []);

  return {
    marketData,
    orderBooks,
    newWebhook,
    isConnected,
    subscribe,
    unsubscribe,
  };
}
