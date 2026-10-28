// Server-only: the two endpoints Frankie expects on the host app.
// Used by the Vite dev middleware (vite.config.ts) and the Vercel functions (api/frankie/*).
import { createHash } from "node:crypto";
import { SignJWT } from "jose";
import { findUser, readCookie, SESSION_COOKIE } from "../shared/users.js";

export type Env = Record<string, string | undefined>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** POST /api/frankie/token: a 5-minute HS256 JWT for the signed-in user. */
export async function handleToken(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Session first, so signed out is 401 whether or not the secret is set.
  const user = findUser(readCookie(request.headers.get("cookie"), SESSION_COOKIE));
  if (!user) return json({ token: null, error: "signed_out" }, 401);

  const secret = env.FRANKIE_JWT_SECRET;
  if (!secret) return json({ error: "FRANKIE_JWT_SECRET is not set on the server" }, 503);

  const token = await new SignJWT({ name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("300s")
    .sign(new TextEncoder().encode(secret));
  return json({ token });
}

/** GET /api/frankie/health: what Frankie's dashboard checks to confirm the install. */
export function handleHealth(env: Env): Response {
  const secret = env.FRANKIE_JWT_SECRET;
  return json({
    frankie: true,
    publishableKey: Boolean(env.VITE_FRANKIE_KEY),
    agents: { support: Boolean(env.VITE_FRANKIE_KEY_SUPPORT), docs: Boolean(env.VITE_FRANKIE_KEY_DOCS) },
    jwtSecret: Boolean(secret),
    jwtSecretFingerprint: secret ? createHash("sha256").update(secret, "utf8").digest("hex").slice(0, 8) : null,
  });
}
