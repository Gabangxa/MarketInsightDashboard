import type { Express, Request, Response } from "express";
import { fetchBinance, fetchBybit, fetchOKX, calculateCandleCount, MINIMUM_CANDLES_FOR_INDICATORS } from "./fetch-candles-utils";

export async function registerHistoricalDataRoutes(app: Express) {
  app.get("/api/historical-data", async (req: Request, res: Response) => {
    try {
      const { symbol, timeframe, period, exchanges, endTime } = req.query;

      if (!symbol || !timeframe || !period) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const exchangeList = (exchanges as string || "bybit,okx").split(",").map(e => e.toLowerCase());
      const limit = calculateCandleCount(period as string, timeframe as string);
      const endTimestamp = endTime ? parseInt(endTime as string) : undefined;

      console.log(`[Historical] Fetching ${limit} candles for ${symbol} ${timeframe} from ${exchangeList.join(",")} ${endTimestamp ? `ending at ${endTimestamp}` : ""}`);

      const promises = [];
      if (exchangeList.includes("binance")) promises.push(fetchBinance(symbol as string, timeframe as string, limit, endTimestamp));
      if (exchangeList.includes("bybit")) promises.push(fetchBybit(symbol as string, timeframe as string, limit, endTimestamp));
      if (exchangeList.includes("okx")) promises.push(fetchOKX(symbol as string, timeframe as string, limit, endTimestamp));

      const results = await Promise.all(promises);

      // Merge candles
      const candleMap = new Map<number, any>();

      for (const candleArray of results) {
        for (const candle of candleArray) {
          const existing = candleMap.get(candle.timestamp);
          if (!existing) {
            candleMap.set(candle.timestamp, candle);
          } else {
            candleMap.set(candle.timestamp, {
              timestamp: candle.timestamp,
              open: (existing.open + candle.open) / 2,
              high: Math.max(existing.high, candle.high),
              low: Math.min(existing.low, candle.low),
              close: (existing.close + candle.close) / 2,
              volume: existing.volume + candle.volume,
            });
          }
        }
      }

      const candles = Array.from(candleMap.values()).sort((a, b) => a.timestamp - b.timestamp);
      res.json(candles);
    } catch (error) {
      console.error("Historical data fetch error:", error);
      res.status(500).json({ error: "Failed to fetch historical data" });
    }
  });
}
