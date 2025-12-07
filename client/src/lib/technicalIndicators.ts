/**
 * Technical Indicators Library
 * Implements popular trading indicators inspired by TradingView functionality
 * Optimized for real-time market data processing
 */

import { MINIMUM_CANDLES_FOR_INDICATORS } from './constants';

export interface PriceData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface IndicatorValue {
  timestamp: number;
  value: number;
  signal?: 'buy' | 'sell' | 'hold';
  metadata?: Record<string, any>;
}

export interface IndicatorResult {
  name: string;
  values: IndicatorValue[];
  config: Record<string, any>;
  lastValue?: IndicatorValue;
}

/**
 * Calculates a Recursive Moving Average (RMA), also known as Wilder's Smoothing.
 * This is the standard smoothing used for RSI and ATR.
 */
function calculateRMA(data: number[], period: number): number[] {
  const rmaValues: number[] = [];
  if (data.length < period) return rmaValues;

  // Calculate first value as simple SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  let prevRMA = sum / period;
  rmaValues.push(prevRMA);

  // Calculate subsequent values using recursive formula
  const alpha = 1 / period; // Wilder's smoothing uses 1/N
  for (let i = period; i < data.length; i++) {
    const rma = (data[i] * alpha) + (prevRMA * (1 - alpha));
    rmaValues.push(rma);
    prevRMA = rma;
  }

  return rmaValues;
}

/**
 * Simple Moving Average (SMA)
 */
export function calculateSMA(data: PriceData[], period: number): IndicatorResult {
  const values: IndicatorValue[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, item) => acc + item.close, 0);
    const sma = sum / period;
    
    values.push({
      timestamp: data[i].timestamp,
      value: sma
    });
  }
  
  return {
    name: `SMA(${period})`,
    values,
    config: { period },
    lastValue: values[values.length - 1]
  };
}

/**
 * Exponential Moving Average (EMA)
 */
export function calculateEMA(data: PriceData[], period: number): IndicatorResult {
  const values: IndicatorValue[] = [];
  const multiplier = 2 / (period + 1);
  
  // Start with SMA for first value
  if (data.length >= period) {
    const smaSlice = data.slice(0, period);
    const sma = smaSlice.reduce((acc, item) => acc + item.close, 0) / period;
    
    values.push({
      timestamp: data[period - 1].timestamp,
      value: sma
    });
    
    // Calculate EMA for remaining values
    for (let i = period; i < data.length; i++) {
      const ema = (data[i].close * multiplier) + (values[values.length - 1].value * (1 - multiplier));
      values.push({
        timestamp: data[i].timestamp,
        value: ema
      });
    }
  }
  
  return {
    name: `EMA(${period})`,
    values,
    config: { period },
    lastValue: values[values.length - 1]
  };
}

/**
 * Relative Strength Index (RSI)
 */
export function calculateRSI(data: PriceData[], period: number = 14): IndicatorResult {
  const values: IndicatorValue[] = [];
  if (data.length < period + 1) {
    return { name: `RSI(${period})`, values: [], config: { period } };
  }

  // Calculate price changes
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  // Calculate smoothed averages using RMA
  const avgGains = calculateRMA(gains, period);
  const avgLosses = calculateRMA(losses, period);

  // Calculate RSI values
  for (let i = 0; i < avgGains.length; i++) {
    const avgGain = avgGains[i];
    const avgLoss = avgLosses[i];
    
    // Handle edge cases for zero values
    let rsi: number;
    let rs: number;
    if (avgLoss === 0 && avgGain === 0) {
      rsi = 50; // Flat market, neutral RSI
      rs = 1; // Neutral RS
    } else if (avgLoss === 0) {
      rsi = 100; // Only gains, RSI at maximum
      rs = Infinity; // Infinite RS when no losses
    } else {
      rs = avgGain / avgLoss;
      rsi = 100 - (100 / (1 + rs));
    }
    
    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    if (rsi <= 30) signal = 'buy';
    else if (rsi >= 70) signal = 'sell';
    
    // We start from `period` (index `period`) because RMA adds first value at index `period-1`
    // and RSI needs 1 prior change, so data[period] aligns with first RMA.
    values.push({
      timestamp: data[i + period].timestamp,
      value: rsi,
      signal,
      metadata: { avgGain, avgLoss, rs }
    });
  }
  
  return {
    name: `RSI(${period})`,
    values,
    config: { period },
    lastValue: values[values.length - 1]
  };
}

/**
 * Moving Average Convergence Divergence (MACD)
 */
export function calculateMACD(data: PriceData[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): IndicatorResult {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  const values: IndicatorValue[] = [];
  
  // Calculate MACD line (fast EMA - slow EMA)
  const macdLine: number[] = [];
  const timestamps: number[] = [];
  
  for (let i = 0; i < Math.min(fastEMA.values.length, slowEMA.values.length); i++) {
    const macdValue = fastEMA.values[i].value - slowEMA.values[i].value;
    macdLine.push(macdValue);
    timestamps.push(fastEMA.values[i].timestamp);
  }
  
  // Calculate Signal line (EMA of MACD line)
  const signalLine: number[] = [];
  if (macdLine.length >= signalPeriod) {
    const multiplier = 2 / (signalPeriod + 1);
    
    // First signal value is SMA
    const sma = macdLine.slice(0, signalPeriod).reduce((acc, val) => acc + val, 0) / signalPeriod;
    signalLine.push(sma);
    
    // Subsequent values are EMA
    for (let i = signalPeriod; i < macdLine.length; i++) {
      const ema = (macdLine[i] * multiplier) + (signalLine[signalLine.length - 1] * (1 - multiplier));
      signalLine.push(ema);
    }
  }
  
  // Generate final values with signals
  const startIdx = signalPeriod - 1;
  for (let i = 0; i < signalLine.length; i++) {
    const macdValue = macdLine[startIdx + i];
    const signalValue = signalLine[i];
    const histogram = macdValue - signalValue;
    
    // Generate buy/sell signals based on MACD crossover
    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    if (i > 0) {
      const prevHistogram = macdLine[startIdx + i - 1] - signalLine[i - 1];
      if (prevHistogram <= 0 && histogram > 0) signal = 'buy';
      else if (prevHistogram >= 0 && histogram < 0) signal = 'sell';
    }
    
    values.push({
      timestamp: timestamps[startIdx + i],
      value: macdValue,
      signal,
      metadata: {
        macd: macdValue,
        signal: signalValue,
        histogram: histogram
      }
    });
  }
  
  return {
    name: `MACD(${fastPeriod},${slowPeriod},${signalPeriod})`,
    values,
    config: { fastPeriod, slowPeriod, signalPeriod },
    lastValue: values[values.length - 1]
  };
}

/**
 * Bollinger Bands
 */
export function calculateBollingerBands(data: PriceData[], period: number = 20, standardDeviations: number = 2): IndicatorResult {
  const values: IndicatorValue[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    
    // Calculate SMA
    const sma = slice.reduce((acc, item) => acc + item.close, 0) / period;
    
    // Calculate Standard Deviation
    const variance = slice.reduce((acc, item) => {
      const diff = item.close - sma;
      return acc + (diff * diff);
    }, 0) / period;
    
    const stdDev = Math.sqrt(variance);
    
    const upperBand = sma + (standardDeviations * stdDev);
    const lowerBand = sma - (standardDeviations * stdDev);
    
    const currentPrice = data[i].close;
    
    // Generate signals based on price relative to bands
    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    if (currentPrice <= lowerBand) signal = 'buy';
    else if (currentPrice >= upperBand) signal = 'sell';
    
    values.push({
      timestamp: data[i].timestamp,
      value: sma,
      signal,
      metadata: {
        sma: sma,
        upperBand: upperBand,
        lowerBand: lowerBand,
        standardDeviations: standardDeviations,
        bandwidth: upperBand - lowerBand,
        position: ((currentPrice - lowerBand) / (upperBand - lowerBand)) * 100 // %B indicator
      }
    });
  }
  
  return {
    name: `BB(${period},${standardDeviations})`,
    values,
    config: { period, standardDeviations },
    lastValue: values[values.length - 1]
  };
}

/**
 * Stochastic Oscillator
 */
export function calculateStochastic(data: PriceData[], kPeriod: number = 14, dPeriod: number = 3): IndicatorResult {
  const values: IndicatorValue[] = [];
  const kValues: number[] = [];
  
  // Calculate %K
  for (let i = kPeriod - 1; i < data.length; i++) {
    const slice = data.slice(i - kPeriod + 1, i + 1);
    const highestHigh = Math.max(...slice.map(d => d.high));
    const lowestLow = Math.min(...slice.map(d => d.low));
    const currentClose = data[i].close;
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    kValues.push(k);
  }
  
  // Calculate %D (SMA of %K)
  for (let i = dPeriod - 1; i < kValues.length; i++) {
    const dSlice = kValues.slice(i - dPeriod + 1, i + 1);
    const d = dSlice.reduce((acc, val) => acc + val, 0) / dPeriod;
    
    const k = kValues[i];
    
    // Generate signals
    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    if (k <= 20 && d <= 20) signal = 'buy';
    else if (k >= 80 && d >= 80) signal = 'sell';
    
    values.push({
      timestamp: data[kPeriod - 1 + i].timestamp,
      value: k,
      signal,
      metadata: {
        k: k,
        d: d
      }
    });
  }
  
  return {
    name: `Stoch(${kPeriod},${dPeriod})`,
    values,
    config: { kPeriod, dPeriod },
    lastValue: values[values.length - 1]
  };
}

/**
 * Average True Range (ATR) - Volatility Indicator
 */
export function calculateATR(data: PriceData[], period: number = 14): IndicatorResult {
  const values: IndicatorValue[] = [];
  const trueRanges: number[] = [];
  
  // Calculate True Range for each period
  for (let i = 1; i < data.length; i++) {
    const current = data[i];
    const previous = data[i - 1];
    
    const tr1 = current.high - current.low;
    const tr2 = Math.abs(current.high - previous.close);
    const tr3 = Math.abs(current.low - previous.close);
    
    const trueRange = Math.max(tr1, tr2, tr3);
    trueRanges.push(trueRange);
  }

  // Calculate ATR using RMA
  const atrValues = calculateRMA(trueRanges, period);
  
  const values_list: IndicatorValue[] = atrValues.map((atr, i) => {
    // We start from `period` (index `period`) because RMA adds first value at index `period-1`
    // and TR needs 1 prior bar, so data[period] aligns with first RMA.
    return {
      timestamp: data[i + period].timestamp,
      value: atr,
      metadata: {
        trueRange: trueRanges[i + period - 1] // Get the corresponding TR
      }
    };
  });
  
  return {
    name: `ATR(${period})`,
    values: values_list,
    config: { period },
    lastValue: values_list[values_list.length - 1]
  };
}

/**
 * Fibonacci Retracement Levels
 * Calculates key Fibonacci levels based on the high/low range of the given data
 */
export interface FibonacciLevel {
  level: number;
  price: number;
  label: string;
}

export interface FibonacciResult {
  name: string;
  high: number;
  low: number;
  range: number;
  trend: 'uptrend' | 'downtrend';
  levels: FibonacciLevel[];
  currentPrice: number;
  nearestLevel: FibonacciLevel | null;
  signal: 'buy' | 'sell' | 'hold';
}

export function calculateFibonacciRetracement(data: PriceData[], lookbackPeriod: number = 50): FibonacciResult | null {
  if (data.length < lookbackPeriod) {
    return null;
  }

  const recentData = data.slice(-lookbackPeriod);
  
  // Find the swing high and swing low
  let swingHigh = -Infinity;
  let swingLow = Infinity;
  let highIndex = 0;
  let lowIndex = 0;

  recentData.forEach((candle, index) => {
    if (candle.high > swingHigh) {
      swingHigh = candle.high;
      highIndex = index;
    }
    if (candle.low < swingLow) {
      swingLow = candle.low;
      lowIndex = index;
    }
  });

  const range = swingHigh - swingLow;
  const currentPrice = data[data.length - 1].close;
  
  // Determine trend based on which came first - high or low
  const trend: 'uptrend' | 'downtrend' = highIndex > lowIndex ? 'uptrend' : 'downtrend';

  // Standard Fibonacci retracement levels
  const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const levelLabels = ['0%', '23.6%', '38.2%', '50%', '61.8%', '78.6%', '100%'];

  const levels: FibonacciLevel[] = fibLevels.map((level, index) => {
    let price: number;
    if (trend === 'uptrend') {
      // In uptrend, retracement levels are calculated from high going down
      price = swingHigh - (range * level);
    } else {
      // In downtrend, retracement levels are calculated from low going up
      price = swingLow + (range * level);
    }
    return {
      level,
      price,
      label: levelLabels[index]
    };
  });

  // Find nearest Fibonacci level to current price
  let nearestLevel: FibonacciLevel | null = null;
  let minDistance = Infinity;

  levels.forEach(level => {
    const distance = Math.abs(currentPrice - level.price);
    if (distance < minDistance) {
      minDistance = distance;
      nearestLevel = level;
    }
  });

  // Generate signal based on price position relative to key levels
  let signal: 'buy' | 'sell' | 'hold' = 'hold';
  const pricePosition = (currentPrice - swingLow) / range;

  if (trend === 'uptrend') {
    // In uptrend, look for buy signals near support (38.2%, 50%, 61.8%)
    if (pricePosition >= 0.382 && pricePosition <= 0.5) signal = 'buy';
    else if (pricePosition >= 0.618 && pricePosition <= 0.786) signal = 'buy';
    else if (pricePosition >= 0.95) signal = 'sell'; // Near resistance
  } else {
    // In downtrend, look for sell signals near resistance
    if (pricePosition >= 0.5 && pricePosition <= 0.618) signal = 'sell';
    else if (pricePosition >= 0.786) signal = 'sell';
    else if (pricePosition <= 0.236) signal = 'buy'; // Potential reversal
  }

  return {
    name: `Fibonacci(${lookbackPeriod})`,
    high: swingHigh,
    low: swingLow,
    range,
    trend,
    levels,
    currentPrice,
    nearestLevel,
    signal
  };
}

/**
 * Williams %R
 */
export function calculateWilliamsR(data: PriceData[], period: number = 14): IndicatorResult {
  const values: IndicatorValue[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const highestHigh = Math.max(...slice.map(d => d.high));
    const lowestLow = Math.min(...slice.map(d => d.low));
    const currentClose = data[i].close;
    
    const williamsR = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
    
    // Generate signals
    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    if (williamsR <= -80) signal = 'buy';  // Oversold
    else if (williamsR >= -20) signal = 'sell'; // Overbought
    
    values.push({
      timestamp: data[i].timestamp,
      value: williamsR,
      signal,
      metadata: {
        highestHigh,
        lowestLow
      }
    });
  }
  
  return {
    name: `Williams%R(${period})`,
    values,
    config: { period },
    lastValue: values[values.length - 1]
  };
}

/**
 * Utility function to convert market data to PriceData format
 */
export function convertToPriceData(marketDataArray: any[]): PriceData[] {
  return marketDataArray.map(data => ({
    timestamp: new Date(data.timestamp || Date.now()).getTime(),
    open: parseFloat(data.open || data.price || 0),
    high: parseFloat(data.high || data.price || 0),
    low: parseFloat(data.low || data.price || 0),
    close: parseFloat(data.close || data.price || 0),
    volume: parseFloat(data.volume || 0)
  }));
}

/**
 * Calculate all indicators for given data
 */
export function calculateAllIndicators(data: PriceData[]): Record<string, IndicatorResult> {
  if (data.length < MINIMUM_CANDLES_FOR_INDICATORS) {
    return {}; // Need minimum data for accurate indicator calculations
  }
  
  return {
    sma20: calculateSMA(data, 20),
    sma50: calculateSMA(data, 50),
    ema12: calculateEMA(data, 12),
    ema26: calculateEMA(data, 26),
    rsi: calculateRSI(data, 14),
    macd: calculateMACD(data, 12, 26, 9),
    bollingerBands: calculateBollingerBands(data, 20, 2),
    stochastic: calculateStochastic(data, 14, 3),
    atr: calculateATR(data, 14),
    williamsR: calculateWilliamsR(data, 14)
  };
}