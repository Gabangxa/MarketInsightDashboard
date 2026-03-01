import WebSocket from "ws";
import { EventEmitter } from "events";
import type { FundingRateData } from "@shared/types";

export class FundingRateManager extends EventEmitter {
  private bybitLinearConnections: Map<string, WebSocket> = new Map();
  private bybitPingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private binanceIntervals: Map<string, NodeJS.Timeout> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

  subscribeToSymbol(symbol: string) {
    this.connectBybitLinear(symbol);
    this.pollBinance(symbol);
  }

  unsubscribeFromSymbol(symbol: string) {
    const key = `bybit-linear-${symbol}`;

    const ws = this.bybitLinearConnections.get(key);
    if (ws) {
      ws.close();
      this.bybitLinearConnections.delete(key);
    }

    const pingInterval = this.bybitPingIntervals.get(key);
    if (pingInterval) {
      clearInterval(pingInterval);
      this.bybitPingIntervals.delete(key);
    }

    const reconnectTimeout = this.reconnectTimeouts.get(key);
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      this.reconnectTimeouts.delete(key);
    }

    const binanceInterval = this.binanceIntervals.get(symbol);
    if (binanceInterval) {
      clearInterval(binanceInterval);
      this.binanceIntervals.delete(symbol);
    }
  }

  private connectBybitLinear(symbol: string) {
    const key = `bybit-linear-${symbol}`;
    const existing = this.bybitLinearConnections.get(key);
    if (existing?.readyState === WebSocket.OPEN) existing.close();

    const ws = new WebSocket("wss://stream.bybit.com/v5/public/linear");
    this.bybitLinearConnections.set(key, ws);

    ws.on("open", () => {
      console.log(`[Bybit Linear] Connected for ${symbol}`);
      ws.send(JSON.stringify({ op: "subscribe", args: [`tickers.${symbol}`] }));

      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ op: "ping" }));
        }
      }, 20_000);
      this.bybitPingIntervals.set(key, pingInterval);
    });

    ws.on("message", (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle pong for latency tracking
        if (message.op === "pong") {
          this.emit("systemStatus", {
            exchange: "Bybit Linear",
            status: "connected",
            latency: 0,
            lastUpdate: Date.now(),
          });
          return;
        }

        if (message.topic?.startsWith("tickers.") && message.data) {
          const t = message.data;
          const fundingRate = parseFloat(t.fundingRate);
          if (isNaN(fundingRate)) return;

          const payload: FundingRateData = {
            exchange: "Bybit",
            symbol: t.symbol,
            fundingRate,
            fundingRatePercent: fundingRate * 100,
            nextFundingTime: parseInt(t.nextFundingTime, 10),
            markPrice: parseFloat(t.markPrice),
            timestamp: Date.now(),
          };
          console.log(
            `[FundingRate] Bybit ${payload.symbol}  rate=${payload.fundingRatePercent.toFixed(4)}%  markPrice=${payload.markPrice}  nextFunding=${new Date(payload.nextFundingTime).toISOString()}`
          );
          this.emit("fundingRate", payload);
        }
      } catch (error) {
        console.error("[Bybit Linear] Message parse error:", error);
      }
    });

    ws.on("error", (error) => {
      console.error("[Bybit Linear] WebSocket error:", error);
    });

    ws.on("close", () => {
      console.log(`[Bybit Linear] Connection closed for ${symbol}, reconnecting...`);
      const pingInterval = this.bybitPingIntervals.get(key);
      if (pingInterval) {
        clearInterval(pingInterval);
        this.bybitPingIntervals.delete(key);
      }
      this.bybitLinearConnections.delete(key);
      this.scheduleReconnect(key, () => this.connectBybitLinear(symbol));
    });
  }

  private async pollBinance(symbol: string) {
    const url = `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`;

    const doFetch = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return; // geo-restricted or rate-limited — silently skip
        const d = await res.json() as {
          lastFundingRate: string;
          nextFundingTime: number;
          markPrice: string;
        };
        const fundingRate = parseFloat(d.lastFundingRate);
        if (isNaN(fundingRate)) return;

        const payload: FundingRateData = {
          exchange: "Binance",
          symbol,
          fundingRate,
          fundingRatePercent: fundingRate * 100,
          nextFundingTime: d.nextFundingTime,
          markPrice: parseFloat(d.markPrice),
          timestamp: Date.now(),
        };
        console.log(
          `[FundingRate] Binance ${payload.symbol}  rate=${payload.fundingRatePercent.toFixed(4)}%  markPrice=${payload.markPrice}  nextFunding=${new Date(payload.nextFundingTime).toISOString()}`
        );
        this.emit("fundingRate", payload);
      } catch {
        // Silently ignore — Binance may be geo-restricted
      }
    };

    await doFetch();
    const interval = setInterval(doFetch, 30_000);
    this.binanceIntervals.set(symbol, interval);
  }

  private scheduleReconnect(key: string, reconnectFn: () => void) {
    const existing = this.reconnectTimeouts.get(key);
    if (existing) clearTimeout(existing);
    const timeout = setTimeout(() => {
      reconnectFn();
      this.reconnectTimeouts.delete(key);
    }, 5_000);
    this.reconnectTimeouts.set(key, timeout);
  }

  disconnect() {
    this.bybitLinearConnections.forEach((ws) => ws.close());
    this.bybitLinearConnections.clear();
    this.bybitPingIntervals.forEach((interval) => clearInterval(interval));
    this.bybitPingIntervals.clear();
    this.binanceIntervals.forEach((interval) => clearInterval(interval));
    this.binanceIntervals.clear();
    this.reconnectTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.reconnectTimeouts.clear();
  }
}

export const fundingRateManager = new FundingRateManager();
