import { describe, it, expect, beforeEach } from "vitest";
import { aggregateMarketData, aggregateOrderBook } from "./marketAggregation";
import type { MarketData, OrderBookData } from "@shared/types";

function makeMarketData(
  exchange: string,
  symbol: string,
  price: number,
  volume = 1_000_000,
  priceChange = 1
): MarketData {
  return { exchange, symbol, price, volume24h: volume, priceChange24h: priceChange, timestamp: Date.now() };
}

function makeOrderBook(
  exchange: string,
  symbol: string,
  bids: Array<[number, number]>,
  asks: Array<[number, number]>
): OrderBookData {
  return { exchange, symbol, bids, asks, timestamp: Date.now() };
}

describe("aggregateMarketData", () => {
  it("returns null for empty map", () => {
    expect(aggregateMarketData("BTCUSDT", new Map())).toBeNull();
  });

  it("averages price across exchanges", () => {
    const data = new Map<string, MarketData>([
      ["Bybit", makeMarketData("Bybit", "BTCUSDT", 100)],
      ["OKX", makeMarketData("OKX", "BTCUSDT", 200)],
    ]);
    const result = aggregateMarketData("BTCUSDT", data);
    expect(result).not.toBeNull();
    expect(result!.price).toBeCloseTo(150);
  });

  it("lists all contributing exchanges", () => {
    const data = new Map<string, MarketData>([
      ["Bybit", makeMarketData("Bybit", "BTCUSDT", 100)],
      ["OKX", makeMarketData("OKX", "BTCUSDT", 200)],
    ]);
    const result = aggregateMarketData("BTCUSDT", data);
    expect(result!.exchanges).toContain("Bybit");
    expect(result!.exchanges).toContain("OKX");
  });

  it("single exchange returns that price exactly", () => {
    const data = new Map<string, MarketData>([
      ["Bybit", makeMarketData("Bybit", "ETHUSDT", 3000)],
    ]);
    const result = aggregateMarketData("ETHUSDT", data);
    expect(result!.price).toBeCloseTo(3000);
  });

  it("volume24hUSDT is sum of all exchange volumes", () => {
    const data = new Map<string, MarketData>([
      ["Bybit", makeMarketData("Bybit", "BTCUSDT", 100, 500_000)],
      ["OKX", makeMarketData("OKX", "BTCUSDT", 100, 300_000)],
    ]);
    const result = aggregateMarketData("BTCUSDT", data);
    expect(result!.volume24hUSDT).toBeCloseTo(800_000);
  });
});

describe("aggregateOrderBook", () => {
  it("returns null for empty map", () => {
    expect(aggregateOrderBook("BTCUSDT", new Map())).toBeNull();
  });

  it("merges bids from multiple exchanges", () => {
    const data = new Map<string, OrderBookData>([
      ["Bybit", makeOrderBook("Bybit", "BTCUSDT", [[100, 1]], [[101, 1]])],
      ["OKX", makeOrderBook("OKX", "BTCUSDT", [[99, 2]], [[102, 2]])],
    ]);
    const result = aggregateOrderBook("BTCUSDT", data);
    expect(result).not.toBeNull();
    // Best bid should be highest: 100
    expect(result!.bids[0].price).toBe(100);
    // Best ask should be lowest: 101
    expect(result!.asks[0].price).toBe(101);
  });

  it("spread is ask - bid", () => {
    const data = new Map<string, OrderBookData>([
      ["Bybit", makeOrderBook("Bybit", "BTCUSDT", [[100, 1]], [[105, 1]])],
    ]);
    const result = aggregateOrderBook("BTCUSDT", data);
    expect(result!.spread).toBeCloseTo(5);
  });

  it("spreadPercent is approximately (spread / bestBid) * 100", () => {
    const data = new Map<string, OrderBookData>([
      ["Bybit", makeOrderBook("Bybit", "BTCUSDT", [[100, 1]], [[110, 1]])],
    ]);
    const result = aggregateOrderBook("BTCUSDT", data);
    expect(result!.spreadPercent).toBeCloseTo(10);
  });

  it("bids are sorted descending", () => {
    const data = new Map<string, OrderBookData>([
      [
        "Bybit",
        makeOrderBook(
          "Bybit",
          "BTCUSDT",
          [
            [90, 1],
            [100, 1],
            [95, 1],
          ],
          [[101, 1]]
        ),
      ],
    ]);
    const result = aggregateOrderBook("BTCUSDT", data);
    const prices = result!.bids.map((b) => b.price);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
    }
  });

  it("asks are sorted ascending", () => {
    const data = new Map<string, OrderBookData>([
      [
        "Bybit",
        makeOrderBook(
          "Bybit",
          "BTCUSDT",
          [[90, 1]],
          [
            [110, 1],
            [100, 1],
            [105, 1],
          ]
        ),
      ],
    ]);
    const result = aggregateOrderBook("BTCUSDT", data);
    const prices = result!.asks.map((a) => a.price);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  it("cumulative totals are non-decreasing", () => {
    const data = new Map<string, OrderBookData>([
      [
        "Bybit",
        makeOrderBook(
          "Bybit",
          "BTCUSDT",
          [
            [100, 2],
            [99, 3],
            [98, 1],
          ],
          [
            [101, 1],
            [102, 4],
          ]
        ),
      ],
    ]);
    const result = aggregateOrderBook("BTCUSDT", data);
    for (let i = 1; i < result!.bids.length; i++) {
      expect(result!.bids[i].total).toBeGreaterThanOrEqual(
        result!.bids[i - 1].total
      );
    }
    for (let i = 1; i < result!.asks.length; i++) {
      expect(result!.asks[i].total).toBeGreaterThanOrEqual(
        result!.asks[i - 1].total
      );
    }
  });
});
