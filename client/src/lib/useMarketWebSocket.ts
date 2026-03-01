import { useEffect, useRef, useState, useCallback } from "react";
import type {
  MarketData,
  OrderBookData,
  SystemStatus,
  WebhookMessage,
  FundingRateData,
  ServerMessage,
  ClientMessage,
} from "@shared/types";

export type { MarketData, OrderBookData, SystemStatus, WebhookMessage, FundingRateData };

interface UseMarketWebSocketReturn {
  marketData: Map<string, Map<string, MarketData>>; // symbol -> exchange -> data
  orderBooks: Map<string, Map<string, OrderBookData>>; // symbol -> exchange -> data
  systemStatus: Map<string, SystemStatus>; // exchange -> status
  newWebhook: WebhookMessage | null;
  fundingRates: Map<string, Map<string, FundingRateData>>; // symbol -> exchange -> data
  isConnected: boolean;
  subscribe: (symbol: string, exchanges: string[]) => void;
  unsubscribe: (symbol: string) => void;
}

export function useMarketWebSocket(): UseMarketWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [marketData, setMarketData] = useState<Map<string, Map<string, MarketData>>>(new Map());
  const [orderBooks, setOrderBooks] = useState<Map<string, Map<string, OrderBookData>>>(new Map());
  const [systemStatus, setSystemStatus] = useState<Map<string, SystemStatus>>(new Map());
  const [newWebhook, setNewWebhook] = useState<WebhookMessage | null>(null);
  const [fundingRates, setFundingRates] = useState<Map<string, Map<string, FundingRateData>>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const subscriptionsRef = useRef<Map<string, string[]>>(new Map());

  const orderBookThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const pendingOrderBookUpdatesRef = useRef<OrderBookData[]>([]);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      subscriptionsRef.current.forEach((exchanges, symbol) => {
        const msg: ClientMessage = { type: "subscribe", symbol, exchanges };
        ws.send(JSON.stringify(msg));
      });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as ServerMessage;

        if (message.type === "marketData") {
          const data = message.data;
          setMarketData((prev) => {
            const newMap = new Map(prev);
            const symbolData = newMap.get(data.symbol) || new Map();
            symbolData.set(data.exchange, data);
            newMap.set(data.symbol, symbolData);
            return newMap;
          });
        } else if (message.type === "orderBook") {
          const data = message.data;
          pendingOrderBookUpdatesRef.current.push(data);
          if (!orderBookThrottleRef.current) {
            orderBookThrottleRef.current = setInterval(() => {
              const updates = pendingOrderBookUpdatesRef.current;
              if (updates.length === 0) return;
              pendingOrderBookUpdatesRef.current = [];
              setOrderBooks((prev) => {
                const newMap = new Map(prev);
                updates.forEach((update) => {
                  const symbolData = newMap.get(update.symbol) || new Map();
                  symbolData.set(update.exchange, update);
                  newMap.set(update.symbol, symbolData);
                });
                return newMap;
              });
            }, 300);
          }
        } else if (message.type === "webhook") {
          setNewWebhook(message.data);
        } else if (message.type === "fundingRate") {
          const d = message.data;
          setFundingRates((prev) => {
            const next = new Map(prev);
            const sym = next.get(d.symbol) ?? new Map<string, FundingRateData>();
            sym.set(d.exchange, d);
            next.set(d.symbol, new Map(sym));
            return next;
          });
        } else if (message.type === "systemStatus") {
          const data = message.data;
          setSystemStatus((prev) => {
            const newMap = new Map(prev);
            newMap.set(data.exchange, data);
            return newMap;
          });
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
      if (orderBookThrottleRef.current) {
        clearInterval(orderBookThrottleRef.current);
        orderBookThrottleRef.current = null;
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (orderBookThrottleRef.current) clearInterval(orderBookThrottleRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const subscribe = useCallback((symbol: string, exchanges: string[]) => {
    subscriptionsRef.current.set(symbol, exchanges);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const msg: ClientMessage = { type: "subscribe", symbol, exchanges };
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const unsubscribe = useCallback((symbol: string) => {
    subscriptionsRef.current.delete(symbol);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const msg: ClientMessage = { type: "unsubscribe", symbol };
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return {
    marketData,
    orderBooks,
    systemStatus,
    newWebhook,
    fundingRates,
    isConnected,
    subscribe,
    unsubscribe,
  };
}
