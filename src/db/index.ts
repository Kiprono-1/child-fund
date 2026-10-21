import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

// Neon HTTP driver — sends every query over HTTPS (port 443) instead of a
// persistent TCP connection on port 5432. This avoids the ~20s ECONNRESET
// that occurs when a router/firewall kills idle TCP connections during Neon's
// cold-start wake-up window.
//
// Trade-offs vs. pg Pool:
//  + No long-lived TCP connection → immune to router idle-timeout resets
//  + Works on any serverless/edge runtime
//  - Each query is an independent HTTP request (no real connection pooling)
//  - db.transaction() uses a single HTTP request with BEGIN/COMMIT batched,
//    which works for Drizzle transactions but not pg.Pool.connect() patterns
//
// DATABASE_SSL is no longer needed — HTTPS is always used.

const sql = neon(databaseUrl);

export const db = drizzle(sql);

/**
 * Errors that indicate a transient failure worth retrying (kept for
 * compatibility — rare over HTTP but possible on network hiccups).
 */
function isRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("connection terminated") ||
    msg.includes("fetch failed") ||
    msg.includes("network")
  );
}

/**
 * Run `fn` up to `maxAttempts` times, retrying on transient network errors.
 */
export async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts || !isRetryable(err)) throw err;
      const delay = 500 * attempt;
      console.warn(
        `[db] transient error on attempt ${attempt}/${maxAttempts}, retrying in ${delay} ms…`
      );
      await new Promise<void>((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}


