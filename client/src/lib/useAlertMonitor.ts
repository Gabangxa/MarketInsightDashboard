import { useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import type { Alert } from "@shared/schema";
import type { MarketData, WebhookMessage } from "./useMarketWebSocket";
import { apiRequest, queryClient } from "./queryClient";

interface AlertMonitorProps {
  alerts: Alert[];
  marketData: Map<string, Map<string, MarketData>>;
  newWebhook: WebhookMessage | null;
}

export function useAlertMonitor({ alerts, marketData, newWebhook }: AlertMonitorProps) {
  
  // Check price alerts
  const checkPriceAlerts = useCallback((alerts: Alert[], marketData: Map<string, Map<string, MarketData>>) => {
    alerts.forEach(async (alert) => {
      if (alert.type !== "price" || !alert.symbol || !alert.condition || !alert.value) return;
      if (alert.triggered) return; // Skip already triggered alerts

      const symbolData = marketData.get(alert.symbol);
      if (!symbolData) return;

      // Filter exchanges based on alert configuration
      const relevantExchanges = alert.exchanges as string[];
      let shouldTrigger = false;
      let triggerPrice = 0;
      let triggerExchange = "";

      symbolData.forEach((data, exchange) => {
        if (relevantExchanges.length === 0 || relevantExchanges.includes(exchange)) {
          const price = data.price;
          const value = parseFloat(alert.value!);
          
          let conditionMet = false;
          switch (alert.condition) {
            case ">":
              conditionMet = price > value;
              break;
            case "<":
              conditionMet = price < value;
              break;
            case ">=":
              conditionMet = price >= value;
              break;
            case "<=":
              conditionMet = price <= value;
              break;
          }

          if (conditionMet) {
            shouldTrigger = true;
            triggerPrice = price;
            triggerExchange = exchange;
          }
        }
      });

      if (shouldTrigger) {
        // Update alert status
        await apiRequest("PATCH", `/api/alerts/${alert.id}`, {
          triggered: true,
          lastTriggered: new Date(),
        });

        // Invalidate alerts query
        queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });

        // Show toast notification
        toast.success(
          `Price Alert: ${alert.symbol} on ${triggerExchange} ${alert.condition} $${alert.value} (Current: $${triggerPrice.toFixed(2)})`,
          {
            duration: 6000,
            icon: "🚨",
          }
        );
      }
    });
  }, []);

  // Check keyword alerts
  const checkKeywordAlerts = useCallback((alerts: Alert[], webhook: WebhookMessage) => {
    alerts.forEach(async (alert) => {
      if (alert.type !== "keyword" || !alert.keyword) return;

      const message = webhook.message.toLowerCase();
      const keyword = alert.keyword.toLowerCase();

      if (message.includes(keyword)) {
        // Update alert status
        await apiRequest("PATCH", `/api/alerts/${alert.id}`, {
          triggered: true,
          lastTriggered: new Date(),
        });

        // Invalidate alerts query
        queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });

        // Show toast notification
        toast(
          `Keyword Alert: "${alert.keyword}" found in webhook from ${webhook.source}`,
          {
            duration: 6000,
            icon: "🔔",
          }
        );
      }
    });
  }, []);

  // Monitor price alerts
  useEffect(() => {
    if (alerts.length === 0) return;
    
    const priceAlerts = alerts.filter(a => a.type === "price" && !a.triggered);
    if (priceAlerts.length > 0 && marketData.size > 0) {
      checkPriceAlerts(priceAlerts, marketData);
    }
  }, [alerts, marketData, checkPriceAlerts]);

  // Monitor keyword alerts
  useEffect(() => {
    if (!newWebhook || alerts.length === 0) return;

    const keywordAlerts = alerts.filter(a => a.type === "keyword");
    if (keywordAlerts.length > 0) {
      checkKeywordAlerts(keywordAlerts, newWebhook);
    }
  }, [newWebhook, alerts, checkKeywordAlerts]);

  return null; // This hook only has side effects
}
