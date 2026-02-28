/** Supported exchange names. Used by both server (WebSocket manager) and client. */
export const SUPPORTED_EXCHANGES = ["Bybit", "OKX"] as const;
export type Exchange = (typeof SUPPORTED_EXCHANGES)[number];

/** Session cookie duration in milliseconds (7 days). */
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
