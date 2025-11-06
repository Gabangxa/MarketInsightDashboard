/**
 * Shared constants used across client and server code
 */

// Minimum candles required for accurate technical indicator calculations
// SMA(50) needs 50 candles, but we use 100+ for better quality and reliability
export const MINIMUM_CANDLES_FOR_INDICATORS = 100;
