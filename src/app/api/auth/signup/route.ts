import { cookies } from "next/headers";
import { createSessionToken, getSecret, hashPassword, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { createGuardianAccount } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string;
      fullName?: string;
      password?: string;
      confirmPassword?: string;
    };
    const email = String(body.email ?? "").trim();
    const fullName = String(body.fullName ?? "").trim();
    const password = String(body.password ?? "");
    const confirmPassword = String(body.confirmPassword ?? "");

    const errors: Record<string, string> = {};
    if (!email) errors.email = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email))
      errors.email = "Enter a valid email address.";
    if (!fullName) errors.fullName = "Full name is required.";
    if (!password) errors.password = "Password is required.";
    else if (password.length < 8)
      errors.password = "Password must be at least 8 characters.";
    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";

    if (Object.keys(errors).length > 0) {
      return Response.json({ ok: false, errors }, { status: 422 });
    }

    const passwordHash = await hashPassword(password);
    let result;
    try {
      result = await createGuardianAccount({ email, fullName, passwordHash });
    } catch (err: unknown) {
      // Catch duplicate-key errors that bubble up before or after ensureSeedData
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code?: string }).code
          : undefined;
      const cause =
        err && typeof err === "object" && "cause" in err
          ? (err as { cause?: unknown }).cause
          : undefined;
      const causeCode =
        cause && typeof cause === "object" && "code" in cause
          ? (cause as { code?: string }).code
          : undefined;
      const errStr = String(err);
      if (
        code === "23505" ||
        causeCode === "23505" ||
        errStr.includes("23505") ||
        errStr.includes("duplicate key")
      ) {
        return Response.json(
          { ok: false, errors: { email: "An account with that email address already exists. Try signing in instead." } },
          { status: 409 },
        );
      }
      throw err;
    }
    if (!result.ok) {
      return Response.json(
        { ok: false, errors: { email: "An account with that email address already exists. Try signing in instead." } },
        { status: 409 },
      );
    }

    const token = createSessionToken(
      { guardianId: result.guardian.id, email: result.guardian.email },
      getSecret(),
    );
    const store = await cookies();
    store.set(SESSION_COOKIE, token, sessionCookieOptions());

    return Response.json(
      { ok: true, guardian: { email: result.guardian.email, fullName: result.guardian.fullName } },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/auth/signup failed:", err);
    return Response.json(
      { ok: false, error: "Sign up failed. Please try again." },
      { status: 500 },
    );
  }
}
