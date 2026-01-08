export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalDataRequest {
  symbol: string;
  timeframe: string;
  period: string;
  exchanges: string[];
}
