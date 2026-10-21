import { cookies } from "next/headers";
import { createSessionToken, getSecret, SESSION_COOKIE, sessionCookieOptions, verifyPassword } from "@/lib/auth";
import { getGuardianAccountByEmail } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return Response.json(
        { ok: false, error: "Enter your email and password." },
        { status: 422 },
      );
    }

    const account = await getGuardianAccountByEmail(email);
    const valid = account ? await verifyPassword(password, account.passwordHash) : false;
    // Same message for missing account and wrong password to avoid enumeration.
    if (!account || !valid) {
      return Response.json(
        { ok: false, error: "That email and password do not match an account." },
        { status: 401 },
      );
    }

    const token = createSessionToken({ guardianId: account.id, email: account.email }, getSecret());
    const store = await cookies();
    store.set(SESSION_COOKIE, token, sessionCookieOptions());

    return Response.json({
      ok: true,
      guardian: { email: account.email, fullName: account.fullName },
    });
  } catch (err) {
    console.error("POST /api/auth/login failed:", err);
    return Response.json(
      { ok: false, error: "Sign in failed. Please try again." },
      { status: 500 },
    );
  }
}
