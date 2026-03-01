import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { wsManager, type MarketData, type OrderBookData, type SystemStatus } from "./websocket-manager";
import { fundingRateManager } from "./funding-rate-manager";
import type { ServerMessage, ClientMessage, FundingRateData } from "@shared/types";
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

function getUserId(req: Request): string {
  return (req.user as { id: string }).id;
}

export async function registerRoutes(app: Express): Promise<Server> {

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { username, password } = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      const hashedPassword = await hash(password, 10);
      const user = await storage.createUser({ username, password: hashedPassword });
      req.login(user, (err) => {
        if (err) return res.status(500).json({ error: "Failed to login after signup" });
        res.json({ id: user.id, username: user.username });
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(400).json({ error: "Invalid signup data" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate(
      "local",
      (
        err: Error | null,
        user: { id: string; username: string } | false,
        info: { message?: string } | undefined
      ) => {
        if (err) return res.status(500).json({ error: "Authentication failed" });
        if (!user) return res.status(401).json({ error: info?.message ?? "Invalid credentials" });
        req.login(user, (loginErr) => {
          if (loginErr) return res.status(500).json({ error: "Login failed" });
          res.json({ id: user.id, username: user.username });
        });
      }
    )(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ error: "Logout failed" });
      req.session.destroy((destroyErr) => {
        if (destroyErr) console.error("Session destroy error:", destroyErr);
        res.json({ success: true });
      });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated() && req.user) {
      const user = req.user as { id: string; username: string };
      res.json({ id: user.id, username: user.username });
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.url !== "/ws") {
      socket.destroy();
      return;
    }
    const req = request as unknown as Request;
    const res = {
      setHeader: () => {},
      getHeader: () => {},
      end: () => {},
      writeHead: () => {},
    } as unknown as Response;

    sessionParser(req, res, () => {
      passport.initialize()(req, res, () => {
        passport.session()(req, res, () => {
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

  const clients = new Set<WebSocket>();

  wsManager.on("marketData", (data: MarketData) => {
    broadcast({ type: "marketData", data });
  });

  wsManager.on("orderBook", (data: OrderBookData) => {
    broadcast({ type: "orderBook", data });
  });

  fundingRateManager.on("fundingRate", (data: FundingRateData) => {
    broadcast({ type: "fundingRate", data });
  });

  wss.on("connection", (ws: WebSocket, req: Request) => {
    clients.add(ws);
    const session = (req as unknown as { session?: { passport?: { user?: string } } }).session;
    const userId = session?.passport?.user;
    console.log(`Client connected to WebSocket (userId: ${userId})`);

    ws.on("message", (message: Buffer | string) => {
      try {
        const data = JSON.parse(message.toString()) as ClientMessage;
        if (data.type === "subscribe") {
          wsManager.subscribeToSymbol(data.symbol, data.exchanges);
        } else if (data.type === "unsubscribe") {
          wsManager.unsubscribeFromSymbol(data.symbol);
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

  function broadcast(message: ServerMessage) {
    const data = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  app.get("/api/funding-rates", async (req, res) => {
    const symbolsParam = req.query.symbols as string | undefined;
    if (!symbolsParam) return res.json([]);
    const symbols = symbolsParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    try {
      const results = await Promise.all(
        symbols.map(async (symbol) => {
          const url = `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`;
          const response = await fetch(url);
          if (!response.ok) return null;
          const json = await response.json() as {
            result?: { list?: Array<{
              symbol: string;
              markPrice: string;
              fundingRate: string;
              nextFundingTime: string;
            }> };
          };
          const item = json?.result?.list?.[0];
          if (!item) return null;
          const fundingRate = parseFloat(item.fundingRate);
          if (isNaN(fundingRate)) return null;
          return {
            exchange: "Bybit",
            symbol: item.symbol,
            fundingRate,
            fundingRatePercent: fundingRate * 100,
            nextFundingTime: parseInt(item.nextFundingTime, 10),
            markPrice: parseFloat(item.markPrice),
            timestamp: Date.now(),
          };
        })
      );
      res.json(results.filter(Boolean));
    } catch (error) {
      console.error("Funding rates fetch error:", error);
      res.status(500).json({ error: "Failed to fetch funding rates" });
    }
  });

  app.post("/api/webhook", async (req, res) => {
    try {
      const { source, message, ...payload } = req.body;
      const userId = req.isAuthenticated() ? getUserId(req) : "public";
      const validated = insertWebhookMessageSchema.parse({
        userId,
        source: source || "Unknown",
        message: message || JSON.stringify(req.body),
        payload: Object.keys(payload).length > 0 ? payload : undefined,
        bookmarked: false,
      });
      const webhookMessage = await storage.createWebhookMessage(validated);
      broadcast({
        type: "webhook",
        data: {
          ...webhookMessage,
          payload: webhookMessage.payload as Record<string, unknown> | undefined,
          timestamp: webhookMessage.timestamp.toISOString(),
        },
      });
      res.json({ success: true, id: webhookMessage.id });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).json({ error: "Invalid webhook data" });
    }
  });

  app.get("/api/watchlist", requireAuth, async (req, res) => {
    try {
      const tokens = await storage.getWatchlistTokens(getUserId(req));
      res.json(tokens);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch watchlist" });
    }
  });

  app.post("/api/watchlist", requireAuth, async (req, res) => {
    try {
      const validated = insertWatchlistTokenSchema.parse(req.body);
      const token = await storage.createWatchlistToken({ ...validated, userId: getUserId(req) });
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

  app.get("/api/alerts", requireAuth, async (req, res) => {
    try {
      const alerts = await storage.getAlerts(getUserId(req));
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", requireAuth, async (req, res) => {
    try {
      console.log("POST /api/alerts body:", JSON.stringify(req.body, null, 2));
      const validated = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert({ ...validated, userId: getUserId(req) });
      res.json(alert);
    } catch (error) {
      console.error("Alert validation error:", error);
      res.status(400).json({ error: "Invalid alert data" });
    }
  });

  app.patch("/api/alerts/:id", requireAuth, async (req, res) => {
    try {
      const updates = { ...req.body };
      if (updates.lastTriggered && typeof updates.lastTriggered === "string") {
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

  app.get("/api/webhooks", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const messages = await storage.getWebhookMessages(getUserId(req), limit);
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

  app.get("/api/dashboard-config", requireAuth, async (req, res) => {
    try {
      const config = await storage.getDashboardConfig(getUserId(req));
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard config" });
    }
  });

  app.post("/api/dashboard-config", requireAuth, async (req, res) => {
    try {
      const config = await storage.saveDashboardConfig({ userId: getUserId(req), layout: req.body.layout });
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to save dashboard config" });
    }
  });

  app.get("/api/market-sentiment", requireAuth, async (req, res) => {
    try {
      const response = await fetch("https://api.alternative.me/fng/?limit=1");
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Market sentiment fetch error:", error);
      res.status(500).json({ error: "Failed to fetch market sentiment data" });
    }
  });

  return httpServer;
}
