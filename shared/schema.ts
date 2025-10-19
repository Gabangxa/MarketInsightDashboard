import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, boolean, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const watchlistTokens = pgTable("watchlist_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().default("default-user"),
  symbol: text("symbol").notNull(),
  exchanges: jsonb("exchanges").notNull().$type<string[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().default("default-user"),
  type: text("type").notNull(), // 'price' or 'keyword'
  symbol: text("symbol"),
  exchanges: jsonb("exchanges").notNull().$type<string[]>(),
  condition: text("condition"), // '>', '<', '>=', '<='
  value: decimal("value", { precision: 20, scale: 8 }),
  keyword: text("keyword"),
  triggered: boolean("triggered").notNull().default(false),
  lastTriggered: timestamp("last_triggered"),
  triggerCount: integer("trigger_count").notNull().default(0),
  maxTriggers: integer("max_triggers"), // null = unlimited
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const webhookMessages = pgTable("webhook_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().default("default-user"),
  source: text("source").notNull(),
  message: text("message").notNull(),
  payload: jsonb("payload"),
  bookmarked: boolean("bookmarked").notNull().default(false),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const dashboardConfig = pgTable("dashboard_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().default("default-user"),
  layout: jsonb("layout").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertWatchlistTokenSchema = createInsertSchema(watchlistTokens).omit({
  id: true,
  createdAt: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
  triggered: true,
  lastTriggered: true,
  triggerCount: true,
});

export const insertWebhookMessageSchema = createInsertSchema(webhookMessages).omit({
  id: true,
  timestamp: true,
});

export const insertDashboardConfigSchema = createInsertSchema(dashboardConfig).omit({
  id: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type WatchlistToken = typeof watchlistTokens.$inferSelect;
export type InsertWatchlistToken = z.infer<typeof insertWatchlistTokenSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type WebhookMessage = typeof webhookMessages.$inferSelect;
export type InsertWebhookMessage = z.infer<typeof insertWebhookMessageSchema>;
export type DashboardConfig = typeof dashboardConfig.$inferSelect;
export type InsertDashboardConfig = z.infer<typeof insertDashboardConfigSchema>;
