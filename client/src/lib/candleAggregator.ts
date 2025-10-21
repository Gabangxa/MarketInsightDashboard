export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class CandleAggregator {
  private candles: Map<number, Candle> = new Map();
  private timeframe: string;
  private currentCandleTime: number | null = null;
  private currentCandle: Candle | null = null;

  constructor(timeframe: string = "1m") {
    this.timeframe = timeframe;
  }

  private getTimeframeMilliseconds(): number {
    const timeframes: Record<string, number> = {
      "1m": 60 * 1000,
      "5m": 5 * 60 * 1000,
      "15m": 15 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "4h": 4 * 60 * 60 * 1000,
      "1d": 24 * 60 * 60 * 1000,
    };
    return timeframes[this.timeframe] || 60 * 1000;
  }

  private getCandleTime(timestamp: number): number {
    const interval = this.getTimeframeMilliseconds();
    return Math.floor(timestamp / interval) * interval;
  }

  addTick(timestamp: number, price: number, volume: number = 0): void {
    const candleTime = this.getCandleTime(timestamp);

    // If this is a new candle period
    if (this.currentCandleTime !== candleTime) {
      // Save the previous candle if it exists
      if (this.currentCandleTime !== null && this.currentCandle !== null) {
        this.candles.set(this.currentCandleTime, { ...this.currentCandle });
      }

      // Start a new candle
      this.currentCandleTime = candleTime;
      this.currentCandle = {
        open: price,
        high: price,
        low: price,
        close: price,
        volume: volume,
      };
    } else if (this.currentCandle) {
      // Update the current candle
      this.currentCandle.high = Math.max(this.currentCandle.high, price);
      this.currentCandle.low = Math.min(this.currentCandle.low, price);
      this.currentCandle.close = price;
      this.currentCandle.volume += volume;
    }

    // Always update the map with the current candle (including live updates)
    if (this.currentCandleTime !== null && this.currentCandle !== null) {
      this.candles.set(this.currentCandleTime, { ...this.currentCandle });
    }
  }

  getCandles(): Map<number, Candle> {
    return new Map(this.candles);
  }

  clear(): void {
    this.candles.clear();
    this.currentCandleTime = null;
    this.currentCandle = null;
  }

  setTimeframe(timeframe: string): void {
    this.timeframe = timeframe;
    this.clear();
  }

  getTimeframe(): string {
    return this.timeframe;
  }
}
