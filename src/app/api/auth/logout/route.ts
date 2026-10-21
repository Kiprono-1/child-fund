import { cookies } from "next/headers";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const store = await cookies();
    store.set(SESSION_COOKIE, "", sessionCookieOptions(0));
    return Response.json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/logout failed:", err);
    return Response.json({ ok: false, error: "Sign out failed." }, { status: 500 });
  }
}
