import { createHmac, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * Guardian account session helpers (Option A auth).
 *
 * No database access lives here — password hashing and cookie signing are pure
 * crypto. All DB access stays in `src/lib/service.ts`.
 */

export const SESSION_COOKIE = "ctf_session";
const SCRYPT_KEYLEN = 64;

/** Reads the cookie-signing secret. Throws at runtime if it is missing. */
export function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set.");
  return secret;
}

/** Cookie options for the session cookie. `maxAge: 0` deletes the cookie. */
export function sessionCookieOptions(maxAge = 60 * 60 * 24 * 7) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEYLEN, (err, key) => (err ? reject(err) : resolve(key)));
  });
  return `${salt.toString("base64")}:${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const salt = Buffer.from(parts[0], "base64");
  const expected = Buffer.from(parts[1], "base64");
  const computed = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEYLEN, (err, key) => (err ? reject(err) : resolve(key)));
  });
  if (computed.length !== expected.length) return false;
  return timingSafeEqual(computed, expected);
}

type SessionPayload = { guardianId: number; email: string; exp: number };

export function createSessionToken(
  payload: Omit<SessionPayload, "exp">,
  secret: string,
  maxAgeSeconds = 60 * 60 * 24 * 7,
): string {
  const full: SessionPayload = { ...payload, exp: Date.now() + maxAgeSeconds * 1000 };
  const data = Buffer.from(JSON.stringify(full)).toString("base64url");
  const sig = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function readSessionToken(token: string, secret: string): SessionPayload | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = createHmac("sha256", secret).update(data).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionPayload;
    if (
      typeof payload.exp !== "number" ||
      typeof payload.guardianId !== "number" ||
      typeof payload.email !== "string"
    ) {
      return null;
    }
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Returns the logged-in guardian from the request cookies, or `null`.
 * Swallows a missing-secret throw so an unconfigured server degrades to
 * "logged out" on read paths (the auth API routes surface the throw as 500).
 */
export async function getSessionGuardian(): Promise<{ guardianId: number; email: string } | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const payload = readSessionToken(token, getSecret());
    if (!payload) return null;
    return { guardianId: payload.guardianId, email: payload.email };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ //
// Admin session helpers                                               //
// ------------------------------------------------------------------ //

export const ADMIN_SESSION_COOKIE = "ctf_admin_session";

type AdminSessionPayload = { admin: true; exp: number };

/**
 * Creates a signed admin session token. Uses the same HMAC-SHA-256 +
 * base64url pattern as `createSessionToken`. Default max-age is 8 hours.
 */
export function createAdminSessionToken(
  secret: string,
  maxAgeSeconds = 60 * 60 * 8,
): string {
  const full: AdminSessionPayload = { admin: true, exp: Date.now() + maxAgeSeconds * 1000 };
  const data = Buffer.from(JSON.stringify(full)).toString("base64url");
  const sig = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

/**
 * Verifies an admin session token's signature and expiry.
 * Returns the payload on success, `null` on any failure.
 */
export function readAdminSessionToken(
  token: string,
  secret: string,
): AdminSessionPayload | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = createHmac("sha256", secret).update(data).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as AdminSessionPayload;
    if (typeof payload.exp !== "number" || payload.admin !== true) return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Returns `true` if the request carries a valid, unexpired admin session cookie.
 * Swallows all errors so missing-secret degrades to "not authenticated".
 */
export async function getAdminSession(): Promise<boolean> {
  try {
    const store = await cookies();
    const token = store.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) return false;
    const payload = readAdminSessionToken(token, getSecret());
    return payload !== null;
  } catch {
    return false;
  }
}
