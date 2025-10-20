import { useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import type { Alert } from "@shared/schema";
import type { MarketData, WebhookMessage } from "./useMarketWebSocket";
import { apiRequest, queryClient } from "./queryClient";
import { PriceAlertToast, KeywordAlertToast } from "@/components/AlertToast";

interface AlertMonitorProps {
  alerts: Alert[];
  marketData: Map<string, Map<string, MarketData>>;
  newWebhook: WebhookMessage | null;
}

// Track last trigger time for each alert (5 second cooldown)
const TRIGGER_COOLDOWN_MS = 5000;
const lastTriggerTimes = new Map<string, number>();

// Track alerts that have reached their trigger limit (persistent across re-renders)
const reachedLimitAlerts = new Set<string>();

export function useAlertMonitor({ alerts, marketData, newWebhook }: AlertMonitorProps) {
  
  // Cleanup: Remove deleted alerts from tracking Sets
  useEffect(() => {
    const currentAlertIds = new Set(alerts.map(a => a.id));
    
    // Remove any alert IDs that no longer exist
    Array.from(reachedLimitAlerts).forEach(alertId => {
      if (!currentAlertIds.has(alertId)) {
        reachedLimitAlerts.delete(alertId);
        lastTriggerTimes.delete(alertId);
      }
    });
    
    // Also check if any alerts were reset (triggered changed from true to false)
    alerts.forEach(alert => {
      if (alert.triggered === false && reachedLimitAlerts.has(alert.id)) {
        reachedLimitAlerts.delete(alert.id);
      }
    });
  }, [alerts]);
  
  // Check price alerts
  const checkPriceAlerts = useCallback((alerts: Alert[], marketData: Map<string, Map<string, MarketData>>) => {
    alerts.forEach(async (alert) => {
      if (alert.type !== "price" || !alert.symbol || !alert.condition || !alert.value) return;
      
      // Check if alert has already reached its limit (persistent check)
      if (reachedLimitAlerts.has(alert.id)) {
        return; // Skip - this alert has already reached its limit
      }
      
      // Check if alert has reached max triggers
      if (alert.maxTriggers !== null && alert.triggerCount >= alert.maxTriggers) {
        reachedLimitAlerts.add(alert.id); // Mark as reached limit
        return; // Skip alerts that have reached their limit
      }

      // Check cooldown period - prevent rapid re-triggering
      const lastTrigger = lastTriggerTimes.get(alert.id);
      const now = Date.now();
      if (lastTrigger && now - lastTrigger < TRIGGER_COOLDOWN_MS) {
        return; // Skip if within cooldown period
      }

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
        // Set cooldown immediately to prevent duplicate triggers
        lastTriggerTimes.set(alert.id, Date.now());
        
        const newTriggerCount = alert.triggerCount + 1;
        const reachedLimit = alert.maxTriggers !== null && newTriggerCount >= alert.maxTriggers;
        
        // CRITICAL: If limit reached, add to persistent Set to completely stop further triggers
        // This prevents race conditions where fresh data from cache might have triggered=false
        if (reachedLimit) {
          alert.triggered = true;
          reachedLimitAlerts.add(alert.id);
        }
        
        // Update alert status
        await apiRequest("PATCH", `/api/alerts/${alert.id}`, {
          triggered: reachedLimit, // Only mark as "triggered" if limit reached
          lastTriggered: new Date(),
          triggerCount: newTriggerCount,
        });

        // Invalidate alerts query
        queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });

        // Show custom toast notification
        toast.custom(
          (t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'}`}>
              <PriceAlertToast
                symbol={alert.symbol!}
                exchange={triggerExchange}
                condition={alert.condition!}
                value={alert.value!}
                currentPrice={triggerPrice}
              />
            </div>
          ),
          {
            duration: 8000,
            position: "top-right",
          }
        );
      }
    });
  }, []);

  // Check keyword alerts
  const checkKeywordAlerts = useCallback((alerts: Alert[], webhook: WebhookMessage) => {
    alerts.forEach(async (alert) => {
      if (alert.type !== "keyword" || !alert.keyword) return;
      
      // Check if alert has already reached its limit (persistent check)
      if (reachedLimitAlerts.has(alert.id)) {
        return; // Skip - this alert has already reached its limit
      }
      
      // Check if alert has reached max triggers
      if (alert.maxTriggers !== null && alert.triggerCount >= alert.maxTriggers) {
        reachedLimitAlerts.add(alert.id); // Mark as reached limit
        return; // Skip alerts that have reached their limit
      }

      // Check cooldown period - prevent rapid re-triggering
      const lastTrigger = lastTriggerTimes.get(alert.id);
      const now = Date.now();
      if (lastTrigger && now - lastTrigger < TRIGGER_COOLDOWN_MS) {
        return; // Skip if within cooldown period
      }

      const message = webhook.message.toLowerCase();
      const keyword = alert.keyword.toLowerCase();

      if (message.includes(keyword)) {
        // Set cooldown immediately to prevent duplicate triggers
        lastTriggerTimes.set(alert.id, Date.now());
        
        const newTriggerCount = alert.triggerCount + 1;
        const reachedLimit = alert.maxTriggers !== null && newTriggerCount >= alert.maxTriggers;
        
        // CRITICAL: If limit reached, add to persistent Set to completely stop further triggers
        // This prevents race conditions where fresh data from cache might have triggered=false
        if (reachedLimit) {
          alert.triggered = true;
          reachedLimitAlerts.add(alert.id);
        }
        
        // Update alert status
        await apiRequest("PATCH", `/api/alerts/${alert.id}`, {
          triggered: reachedLimit, // Only mark as "triggered" if limit reached
          lastTriggered: new Date(),
          triggerCount: newTriggerCount,
        });

        // Invalidate alerts query
        queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });

        // Show custom toast notification
        toast.custom(
          (t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'}`}>
              <KeywordAlertToast
                keyword={alert.keyword!}
                source={webhook.source}
              />
            </div>
          ),
          {
            duration: 8000,
            position: "top-right",
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
