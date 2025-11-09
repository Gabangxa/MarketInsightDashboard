import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { wsManager, type MarketData, type OrderBookData } from "./websocket-manager";
import { insertWebhookMessageSchema, insertWatchlistTokenSchema, insertAlertSchema, insertUserSchema } from "@shared/schema";
import { hash } from "bcryptjs";
import passport from "passport";
import { sessionParser } from "./index";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { username, password } = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const hashedPassword = await hash(password, 10);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to login after signup" });
        }
        res.json({ id: user.id, username: user.username });
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(400).json({ error: "Invalid signup data" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Authentication failed" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ error: "Login failed" });
        }
        res.json({ id: user.id, username: user.username });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
        }
        res.json({ success: true });
      });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated() && req.user) {
      const user = req.user as any;
      res.json({ id: user.id, username: user.username });
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket authentication: Handle upgrade event manually
  // to properly parse the session using the configured middleware
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.url !== "/ws") {
      socket.destroy();
      return;
    }

    const req = request as any;
    const res = {
      setHeader: () => {},
      getHeader: () => {},
      end: () => {},
      writeHead: () => {},
    } as any;

    // Parse session
    sessionParser(req, res, () => {
      // Initialize passport
      passport.initialize()(req, res, () => {
        passport.session()(req, res, () => {
          // Check if user is authenticated
          if (req.isAuthenticated && req.isAuthenticated()) {
            wss.handleUpgrade(request, socket, head, (ws) => {
              wss.emit("connection", ws, request);
            });
          } else {
            socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
            socket.destroy();
          }
        });
      });
    });
  });

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
  wss.on("connection", (ws: WebSocket, req: any) => {
    clients.add(ws);
    const userId = req.session?.passport?.user;
    console.log(`Client connected to WebSocket (userId: ${userId})`);

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

  // Webhook endpoint - accepts webhooks from external sources
  // Uses authenticated user's ID if available, otherwise creates for all users to see
  app.post("/api/webhook", async (req, res) => {
    try {
      const { source, message, ...payload } = req.body;
      const userId = req.isAuthenticated() ? (req.user as any).id : "public";
      
      const validated = insertWebhookMessageSchema.parse({
        userId,
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
  app.get("/api/watchlist", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const tokens = await storage.getWatchlistTokens(userId);
      res.json(tokens);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch watchlist" });
    }
  });

  app.post("/api/watchlist", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const validated = insertWatchlistTokenSchema.parse(req.body);
      const token = await storage.createWatchlistToken({
        ...validated,
        userId,
      });
      res.json(token);
    } catch (error) {
      res.status(400).json({ error: "Invalid watchlist token data" });
    }
  });

  app.delete("/api/watchlist/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteWatchlistToken(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete token" });
    }
  });

  // Alert endpoints
  app.get("/api/alerts", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const alerts = await storage.getAlerts(userId);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      console.log("POST /api/alerts body:", JSON.stringify(req.body, null, 2));
      const validated = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert({
        ...validated,
        userId,
      });
      res.json(alert);
    } catch (error) {
      console.error("Alert validation error:", error);
      res.status(400).json({ error: "Invalid alert data" });
    }
  });

  app.patch("/api/alerts/:id", requireAuth, async (req, res) => {
    try {
      // Convert lastTriggered string to Date if present
      const updates = { ...req.body };
      if (updates.lastTriggered && typeof updates.lastTriggered === 'string') {
        updates.lastTriggered = new Date(updates.lastTriggered);
      }
      
      const updated = await storage.updateAlert(req.params.id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Alert update error:", error);
      res.status(500).json({ error: "Failed to update alert" });
    }
  });

  app.delete("/api/alerts/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteAlert(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete alert" });
    }
  });

  // Webhook messages endpoints
  app.get("/api/webhooks", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const messages = await storage.getWebhookMessages(userId, limit);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch webhooks" });
    }
  });

  app.patch("/api/webhooks/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateWebhookMessage(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update webhook" });
    }
  });

  // Dashboard config endpoints
  app.get("/api/dashboard-config", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const config = await storage.getDashboardConfig(userId);
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard config" });
    }
  });

  app.post("/api/dashboard-config", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const config = await storage.saveDashboardConfig({
        userId,
        layout: req.body.layout,
      });
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to save dashboard config" });
    }
  });

  return httpServer;
}
