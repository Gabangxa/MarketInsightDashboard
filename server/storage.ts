import { 
  type User, 
  type InsertUser,
  type WatchlistToken,
  type InsertWatchlistToken,
  type Alert,
  type InsertAlert,
  type WebhookMessage,
  type InsertWebhookMessage,
  type DashboardConfig,
  type InsertDashboardConfig,
  users,
  watchlistTokens,
  alerts,
  webhookMessages,
  dashboardConfig
} from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq, desc } from "drizzle-orm";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getWatchlistTokens(userId: string): Promise<WatchlistToken[]>;
  createWatchlistToken(token: InsertWatchlistToken): Promise<WatchlistToken>;
  deleteWatchlistToken(id: string): Promise<void>;
  
  getAlerts(userId: string): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlert(id: string, alert: Partial<Alert>): Promise<Alert | undefined>;
  deleteAlert(id: string): Promise<void>;
  
  getWebhookMessages(userId: string, limit?: number): Promise<WebhookMessage[]>;
  createWebhookMessage(message: InsertWebhookMessage): Promise<WebhookMessage>;
  updateWebhookMessage(id: string, updates: Partial<WebhookMessage>): Promise<WebhookMessage | undefined>;
  
  getDashboardConfig(userId: string): Promise<DashboardConfig | undefined>;
  saveDashboardConfig(config: InsertDashboardConfig): Promise<DashboardConfig>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private watchlistTokens: Map<string, WatchlistToken>;
  private alerts: Map<string, Alert>;
  private webhookMessages: Map<string, WebhookMessage>;
  private dashboardConfigs: Map<string, DashboardConfig>;

  constructor() {
    this.users = new Map();
    this.watchlistTokens = new Map();
    this.alerts = new Map();
    this.webhookMessages = new Map();
    this.dashboardConfigs = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getWatchlistTokens(userId: string): Promise<WatchlistToken[]> {
    return Array.from(this.watchlistTokens.values())
      .filter(token => token.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createWatchlistToken(token: InsertWatchlistToken): Promise<WatchlistToken> {
    const id = randomUUID();
    const newToken: WatchlistToken = {
      ...token,
      id,
      userId: token.userId || "default-user",
      exchanges: token.exchanges as string[],
      createdAt: new Date(),
    };
    this.watchlistTokens.set(id, newToken);
    return newToken;
  }

  async deleteWatchlistToken(id: string): Promise<void> {
    this.watchlistTokens.delete(id);
  }

  async getAlerts(userId: string): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .filter(alert => alert.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const id = randomUUID();
    const newAlert: Alert = {
      ...alert,
      id,
      userId: alert.userId || "default-user",
      symbol: alert.symbol || null,
      exchanges: alert.exchanges as string[],
      condition: alert.condition || null,
      value: alert.value || null,
      keyword: alert.keyword || null,
      triggered: false,
      lastTriggered: null,
      triggerCount: 0,
      maxTriggers: alert.maxTriggers || null,
      createdAt: new Date(),
    };
    this.alerts.set(id, newAlert);
    return newAlert;
  }

  async updateAlert(id: string, updates: Partial<Alert>): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;
    
    const updated = { ...alert, ...updates };
    this.alerts.set(id, updated);
    return updated;
  }

  async deleteAlert(id: string): Promise<void> {
    this.alerts.delete(id);
  }

  async getWebhookMessages(userId: string, limit: number = 100): Promise<WebhookMessage[]> {
    return Array.from(this.webhookMessages.values())
      .filter(msg => msg.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async createWebhookMessage(message: InsertWebhookMessage): Promise<WebhookMessage> {
    const id = randomUUID();
    const newMessage: WebhookMessage = {
      ...message,
      id,
      userId: message.userId || "default-user",
      payload: message.payload || null,
      bookmarked: message.bookmarked || false,
      timestamp: new Date(),
    };
    this.webhookMessages.set(id, newMessage);
    return newMessage;
  }

  async updateWebhookMessage(id: string, updates: Partial<WebhookMessage>): Promise<WebhookMessage | undefined> {
    const message = this.webhookMessages.get(id);
    if (!message) return undefined;
    
    const updated = { ...message, ...updates };
    this.webhookMessages.set(id, updated);
    return updated;
  }

  async getDashboardConfig(userId: string): Promise<DashboardConfig | undefined> {
    return Array.from(this.dashboardConfigs.values())
      .find(config => config.userId === userId);
  }

  async saveDashboardConfig(config: InsertDashboardConfig): Promise<DashboardConfig> {
    const userId = config.userId || "default-user";
    const existing = await this.getDashboardConfig(userId);
    
    if (existing) {
      const updated: DashboardConfig = {
        ...existing,
        layout: config.layout,
        updatedAt: new Date(),
      };
      this.dashboardConfigs.set(existing.id, updated);
      return updated;
    }
    
    const id = randomUUID();
    const newConfig: DashboardConfig = {
      ...config,
      id,
      userId,
      updatedAt: new Date(),
    };
    this.dashboardConfigs.set(id, newConfig);
    return newConfig;
  }
}

export class PostgresStorage implements IStorage {
  private db;

  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(pool);
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getWatchlistTokens(userId: string): Promise<WatchlistToken[]> {
    return await this.db
      .select()
      .from(watchlistTokens)
      .where(eq(watchlistTokens.userId, userId))
      .orderBy(desc(watchlistTokens.createdAt));
  }

  async createWatchlistToken(token: InsertWatchlistToken): Promise<WatchlistToken> {
    const result = await this.db.insert(watchlistTokens).values(token as any).returning();
    return result[0];
  }

  async deleteWatchlistToken(id: string): Promise<void> {
    await this.db.delete(watchlistTokens).where(eq(watchlistTokens.id, id));
  }

  async getAlerts(userId: string): Promise<Alert[]> {
    return await this.db
      .select()
      .from(alerts)
      .where(eq(alerts.userId, userId))
      .orderBy(desc(alerts.createdAt));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const result = await this.db.insert(alerts).values(alert as any).returning();
    return result[0];
  }

  async updateAlert(id: string, updates: Partial<Alert>): Promise<Alert | undefined> {
    const result = await this.db
      .update(alerts)
      .set(updates)
      .where(eq(alerts.id, id))
      .returning();
    return result[0];
  }

  async deleteAlert(id: string): Promise<void> {
    await this.db.delete(alerts).where(eq(alerts.id, id));
  }

  async getWebhookMessages(userId: string, limit: number = 100): Promise<WebhookMessage[]> {
    return await this.db
      .select()
      .from(webhookMessages)
      .where(eq(webhookMessages.userId, userId))
      .orderBy(desc(webhookMessages.timestamp))
      .limit(limit);
  }

  async createWebhookMessage(message: InsertWebhookMessage): Promise<WebhookMessage> {
    const result = await this.db.insert(webhookMessages).values({
      ...message,
      userId: message.userId || "default-user",
    }).returning();
    return result[0];
  }

  async updateWebhookMessage(id: string, updates: Partial<WebhookMessage>): Promise<WebhookMessage | undefined> {
    const result = await this.db
      .update(webhookMessages)
      .set(updates)
      .where(eq(webhookMessages.id, id))
      .returning();
    return result[0];
  }

  async getDashboardConfig(userId: string): Promise<DashboardConfig | undefined> {
    const result = await this.db
      .select()
      .from(dashboardConfig)
      .where(eq(dashboardConfig.userId, userId))
      .limit(1);
    return result[0];
  }

  async saveDashboardConfig(config: InsertDashboardConfig): Promise<DashboardConfig> {
    const userId = config.userId || "default-user";
    const existing = await this.getDashboardConfig(userId);
    
    if (existing) {
      const result = await this.db
        .update(dashboardConfig)
        .set({ layout: config.layout, updatedAt: new Date() })
        .where(eq(dashboardConfig.id, existing.id))
        .returning();
      return result[0];
    }
    
    const result = await this.db.insert(dashboardConfig).values({
      ...config,
      userId,
    }).returning();
    return result[0];
  }
}

export const storage = process.env.DATABASE_URL ? new PostgresStorage() : new MemStorage();
