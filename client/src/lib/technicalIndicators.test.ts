import { describe, it, expect } from "vitest";
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateStochastic,
  calculateWilliamsR,
  calculateATR,
  calculateFibonacciRetracement,
  calculateAllIndicators,
  type PriceData,
} from "./technicalIndicators";

/** Generates a simple ascending price series for testing */
function makeCandles(closes: number[]): PriceData[] {
  return closes.map((close, i) => ({
    timestamp: 1_000_000 + i * 60_000,
    open: close - 1,
    high: close + 2,
    low: close - 2,
    close,
    volume: 100,
  }));
}

/** 150 linearly ascending candles, prices 1..150 */
const LONG_SERIES = makeCandles(Array.from({ length: 150 }, (_, i) => i + 1));

describe("calculateSMA", () => {
  it("returns correct number of values for period 20", () => {
    const result = calculateSMA(LONG_SERIES, 20);
    // SMA(20) on 150 candles → 131 values
    expect(result.values.length).toBe(150 - 20 + 1);
  });

  it("first SMA(5) value is mean of first 5 closes", () => {
    const candles = makeCandles([10, 20, 30, 40, 50, 60]);
    const result = calculateSMA(candles, 5);
    // Mean of [10,20,30,40,50] = 30
    expect(result.values[0].value).toBeCloseTo(30);
  });

  it("returns empty values when data is shorter than period", () => {
    const result = calculateSMA(makeCandles([1, 2, 3]), 5);
    expect(result.values.length).toBe(0);
  });

  it("lastValue matches last element of values array", () => {
    const result = calculateSMA(LONG_SERIES, 20);
    expect(result.lastValue).toEqual(result.values[result.values.length - 1]);
  });
});

describe("calculateEMA", () => {
  it("produces fewer or equal values than SMA for same period", () => {
    const sma = calculateSMA(LONG_SERIES, 12);
    const ema = calculateEMA(LONG_SERIES, 12);
    // EMA starts from index `period - 1` same as SMA
    expect(ema.values.length).toBe(sma.values.length);
  });

  it("EMA is higher than SMA in a rising market (heavier recent weighting)", () => {
    const result = calculateEMA(LONG_SERIES, 12);
    const smaResult = calculateSMA(LONG_SERIES, 12);
    // In rising series, EMA should track closer to recent (higher) prices
    expect(result.lastValue!.value).toBeGreaterThanOrEqual(
      smaResult.lastValue!.value
    );
  });
});

describe("calculateRSI", () => {
  it("RSI is in [0, 100] range", () => {
    const result = calculateRSI(LONG_SERIES, 14);
    result.values.forEach(({ value }) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    });
  });

  it("all-rising series has RSI close to 100", () => {
    const result = calculateRSI(LONG_SERIES, 14);
    expect(result.lastValue!.value).toBeGreaterThan(90);
  });

  it("returns empty values when data is too short", () => {
    const result = calculateRSI(makeCandles([1, 2, 3]), 14);
    expect(result.values.length).toBe(0);
  });

  it("signal is 'sell' when RSI >= 70", () => {
    const result = calculateRSI(LONG_SERIES, 14);
    const highValues = result.values.filter((v) => v.value >= 70);
    highValues.forEach(({ signal }) => expect(signal).toBe("sell"));
  });
});

describe("calculateMACD", () => {
  it("produces values array when data is long enough", () => {
    const result = calculateMACD(LONG_SERIES, 12, 26, 9);
    expect(result.values.length).toBeGreaterThan(0);
  });

  it("metadata contains macd, signal, and histogram keys", () => {
    const result = calculateMACD(LONG_SERIES, 12, 26, 9);
    const last = result.lastValue!;
    expect(last.metadata).toHaveProperty("macd");
    expect(last.metadata).toHaveProperty("signal");
    expect(last.metadata).toHaveProperty("histogram");
  });

  it("histogram = macd - signal", () => {
    const result = calculateMACD(LONG_SERIES, 12, 26, 9);
    const last = result.lastValue!;
    expect(last.metadata!.histogram).toBeCloseTo(
      last.metadata!.macd - last.metadata!.signal,
      5
    );
  });
});

describe("calculateBollingerBands", () => {
  it("upper band is always above lower band", () => {
    const result = calculateBollingerBands(LONG_SERIES, 20, 2);
    result.values.forEach(({ metadata }) => {
      expect(metadata!.upperBand).toBeGreaterThanOrEqual(metadata!.lowerBand);
    });
  });

  it("SMA is the middle band", () => {
    const result = calculateBollingerBands(LONG_SERIES, 20, 2);
    const last = result.lastValue!;
    expect(last.value).toBeCloseTo(last.metadata!.sma, 5);
  });

  it("returns empty for data shorter than period", () => {
    const result = calculateBollingerBands(makeCandles([1, 2, 3]), 20, 2);
    expect(result.values.length).toBe(0);
  });
});

describe("calculateStochastic", () => {
  it("%K is in [0, 100] range", () => {
    const result = calculateStochastic(LONG_SERIES, 14, 3);
    result.values.forEach(({ value }) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    });
  });

  it("returns correct number of values", () => {
    const result = calculateStochastic(LONG_SERIES, 14, 3);
    // kPeriod produces (150 - 14 + 1) = 137 K values, dPeriod=3 consumes 2 → 135
    expect(result.values.length).toBe(150 - 14 - 3 + 2);
  });
});

describe("calculateWilliamsR", () => {
  it("values are in [-100, 0] range", () => {
    const result = calculateWilliamsR(LONG_SERIES, 14);
    result.values.forEach(({ value }) => {
      expect(value).toBeGreaterThanOrEqual(-100);
      expect(value).toBeLessThanOrEqual(0);
    });
  });

  it("signal is 'buy' when Williams %R <= -80", () => {
    const result = calculateWilliamsR(LONG_SERIES, 14);
    result.values
      .filter((v) => v.value <= -80)
      .forEach(({ signal }) => expect(signal).toBe("buy"));
  });
});

describe("calculateATR", () => {
  it("ATR values are non-negative", () => {
    const result = calculateATR(LONG_SERIES, 14);
    result.values.forEach(({ value }) => {
      expect(value).toBeGreaterThanOrEqual(0);
    });
  });

  it("returns empty for insufficient data", () => {
    const result = calculateATR(makeCandles([1, 2]), 14);
    expect(result.values.length).toBe(0);
  });
});

describe("calculateFibonacciRetracement", () => {
  it("returns null when data is shorter than lookback period", () => {
    expect(
      calculateFibonacciRetracement(makeCandles([1, 2, 3]), 50)
    ).toBeNull();
  });

  it("levels array has 7 entries", () => {
    const result = calculateFibonacciRetracement(LONG_SERIES, 50);
    expect(result).not.toBeNull();
    expect(result!.levels).toHaveLength(7);
  });

  it("high is greater than or equal to low", () => {
    const result = calculateFibonacciRetracement(LONG_SERIES, 50);
    expect(result!.high).toBeGreaterThanOrEqual(result!.low);
  });

  it("returns null for flat price series (zero range)", () => {
    // makeCandles sets high = close + 2, low = close - 2.
    // To produce a zero swing range we need all highs === all lows,
    // so we build candles manually with identical OHLC.
    const flat: PriceData[] = Array.from({ length: 60 }, (_, i) => ({
      timestamp: 1_000_000 + i * 60_000,
      open: 100,
      high: 100,
      low: 100,
      close: 100,
      volume: 100,
    }));
    expect(calculateFibonacciRetracement(flat, 50)).toBeNull();
  });
});

describe("calculateAllIndicators", () => {
  it("returns empty object when data is too short", () => {
    const result = calculateAllIndicators(makeCandles([1, 2, 3]));
    expect(result).toEqual({});
  });

  it("returns all expected indicator keys for sufficient data", () => {
    const result = calculateAllIndicators(LONG_SERIES);
    const expectedKeys = [
      "sma20",
      "sma50",
      "ema12",
      "ema26",
      "rsi",
      "macd",
      "bollingerBands",
      "stochastic",
      "atr",
      "williamsR",
    ];
    expectedKeys.forEach((key) => expect(result).toHaveProperty(key));
  });
});
