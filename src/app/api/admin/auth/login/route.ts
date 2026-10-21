import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getSecret,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";

    const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD ?? "";

    if (!adminEmail || !adminPassword) {
      return Response.json(
        { ok: false, error: "Admin credentials are not configured." },
        { status: 500 },
      );
    }

    if (email !== adminEmail || password !== adminPassword) {
      return Response.json(
        { ok: false, error: "Invalid credentials." },
        { status: 401 },
      );
    }

    const token = createAdminSessionToken(getSecret());
    const store = await cookies();
    store.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
      secure: process.env.NODE_ENV === "production",
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Admin login error:", err);
    return Response.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}
