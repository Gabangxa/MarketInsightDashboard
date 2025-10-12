import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { wsManager, type MarketData, type OrderBookData } from "./websocket-manager";
import { insertWebhookMessageSchema, insertWatchlistTokenSchema, insertAlertSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // Store connected clients
  const clients = new Set<WebSocket>();

  // Exchange WebSocket data handlers
  wsManager.on("marketData", (data: MarketData) => {
    broadcast({ type: "marketData", data });
  });

  wsManager.on("orderBook", (data: OrderBookData) => {
    broadcast({ type: "orderBook", data });
  });

  // WebSocket server for client connections
  wss.on("connection", (ws: WebSocket) => {
    clients.add(ws);
    console.log("Client connected to WebSocket");

    ws.on("message", (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === "subscribe") {
          const { symbol, exchanges } = data;
          wsManager.subscribeToSymbol(symbol, exchanges);
        } else if (data.type === "unsubscribe") {
          const { symbol } = data;
          wsManager.unsubscribeFromSymbol(symbol);
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      console.log("Client disconnected from WebSocket");
    });
  });

  function broadcast(message: any) {
    const data = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  // Webhook endpoint
  app.post("/api/webhook", async (req, res) => {
    try {
      const { source, message, ...payload } = req.body;
      
      const validated = insertWebhookMessageSchema.parse({
        userId: "default-user",
        source: source || "Unknown",
        message: message || JSON.stringify(req.body),
        payload: Object.keys(payload).length > 0 ? payload : undefined,
        bookmarked: false,
      });
      
      const webhookMessage = await storage.createWebhookMessage(validated);

      // Broadcast to connected clients with properly formatted timestamp
      broadcast({
        type: "webhook",
        data: {
          ...webhookMessage,
          timestamp: webhookMessage.timestamp.toISOString(),
        },
      });

      res.json({ success: true, id: webhookMessage.id });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).json({ error: "Invalid webhook data" });
    }
  });

  // Watchlist endpoints
  app.get("/api/watchlist", async (req, res) => {
    try {
      const tokens = await storage.getWatchlistTokens("default-user");
      res.json(tokens);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch watchlist" });
    }
  });

  app.post("/api/watchlist", async (req, res) => {
    try {
      const validated = insertWatchlistTokenSchema.parse(req.body);
      const token = await storage.createWatchlistToken({
        ...validated,
        userId: "default-user",
      });
      res.json(token);
    } catch (error) {
      res.status(400).json({ error: "Invalid watchlist token data" });
    }
  });

  app.delete("/api/watchlist/:id", async (req, res) => {
    try {
      await storage.deleteWatchlistToken(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete token" });
    }
  });

  // Alert endpoints
  app.get("/api/alerts", async (req, res) => {
    try {
      const alerts = await storage.getAlerts("default-user");
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    try {
      console.log("POST /api/alerts body:", JSON.stringify(req.body, null, 2));
      const validated = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert({
        ...validated,
        userId: "default-user",
      });
      res.json(alert);
    } catch (error) {
      console.error("Alert validation error:", error);
      res.status(400).json({ error: "Invalid alert data" });
    }
  });

  app.delete("/api/alerts/:id", async (req, res) => {
    try {
      await storage.deleteAlert(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete alert" });
    }
  });

  // Webhook messages endpoints
  app.get("/api/webhooks", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const messages = await storage.getWebhookMessages("default-user", limit);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch webhooks" });
    }
  });

  app.patch("/api/webhooks/:id", async (req, res) => {
    try {
      const updated = await storage.updateWebhookMessage(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update webhook" });
    }
  });

  // Dashboard config endpoints
  app.get("/api/dashboard-config", async (req, res) => {
    try {
      const config = await storage.getDashboardConfig("default-user");
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard config" });
    }
  });

  app.post("/api/dashboard-config", async (req, res) => {
    try {
      const config = await storage.saveDashboardConfig({
        userId: "default-user",
        layout: req.body.layout,
      });
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to save dashboard config" });
    }
  });

  return httpServer;
}
