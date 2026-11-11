import { createHash, createHmac, createPublicKey, randomBytes, timingSafeEqual, verify as verifySignature } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Pool, RowDataPacket } from "mysql2/promise";

const SESSION_COOKIE = "webdev_app_session";
const OAUTH_COOKIE = "sunsensor_google_oauth";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
type StaffIdentity = { id: number; openId: string; name: string; email: string; role: "staff" };
type StaffRequest = Request & { staff?: StaffIdentity };
type OAuthState = { state: string; nonce: string; verifier: string; redirectUri: string };
type StaffRow = RowDataPacket & { id: number; open_id: string; name: string; email: string; role: string };
type SessionRow = StaffRow;
type GoogleClaims = { iss?: string; aud?: string | string[]; azp?: string; exp?: number; iat?: number; nonce?: string; sub?: string; email?: string; email_verified?: boolean; name?: string };
type GoogleJwk = JsonWebKey & { kid?: string; alg?: string; use?: string };

function parseAllowedEmails(): Set<string> {
  return new Set((process.env.SUNSENSOR_STAFF_EMAILS || "").split(/[\s,;]+/).map((email) => email.trim().toLowerCase()).filter(Boolean));
}
function cookieValue(request: Request, name: string): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try { return decodeURIComponent(part.slice(separator + 1).trim()); } catch { return undefined; }
  }
  return undefined;
}
function cookieFlags(isHttps: boolean): string {
  return isHttps ? "; HttpOnly; SameSite=None; Secure" : "; HttpOnly; SameSite=Lax";
}
function setCookie(response: Response, name: string, value: string, isHttps: boolean, maxAge: number, path: string): void {
  response.append("Set-Cookie", `${name}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAge}${cookieFlags(isHttps)}`);
}
function clearCookie(response: Response, name: string, isHttps: boolean, path: string): void {
  setCookie(response, name, "", isHttps, 0, path);
}
function validatedOrigin(value: unknown): URL | null {
  if (typeof value !== "string" || value.length > 512) return null;
  try {
    const url = new URL(value);
    if (url.origin !== value || url.username || url.password) return null;
    if (url.protocol === "https:") return url;
    if (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return url;
  } catch { return null; }
  return null;
}
function loopbackHost(value: string | undefined): boolean {
  if (!value || value.includes(",")) return false;
  try { return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(`http://${value}`).hostname); } catch { return false; }
}
function forwardedPublicOrigin(request: Request): URL | null {
  const host = request.get("x-forwarded-host");
  const protocol = request.get("x-forwarded-proto");
  if (!host || host.includes(",") || !protocol || protocol.includes(",") || !loopbackHost(request.get("host"))) return null;
  return validatedOrigin(`${protocol}://${host}`);
}
function publicRequestOrigin(request: Request): URL | null {
  const origin = validatedOrigin(request.get("origin"));
  if (!origin) return null;
  const forwarded = forwardedPublicOrigin(request);
  if (!forwarded) return origin;
  if (origin.hostname === "localhost" || origin.hostname === "127.0.0.1" || origin.hostname === "[::1]") return forwarded;
  return origin.origin === forwarded.origin ? forwarded : null;
}
function requestCredential(request: Request): string | null {
  return cookieValue(request, SESSION_COOKIE) ?? null;
}
function csrfForCredential(credential: string): string {
  return createHmac("sha256", credential).update("sunsensor-staff-csrf-v1").digest("base64url");
}
function requestOriginIsSafe(request: Request): boolean {
  const origin = publicRequestOrigin(request);
  if (!origin) return false;
  const referer = request.get("referer");
  if (!referer) return true;
  try { return new URL(referer).origin === origin.origin; } catch { return false; }
}
function csrfMatches(request: Request, credential: string | null): boolean {
  const header = request.get("x-sunsensor-csrf");
  if (!credential || !requestOriginIsSafe(request) || !header || !/^[A-Za-z0-9_-]{43}$/.test(header)) return false;
  const expected = Buffer.from(csrfForCredential(credential));
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function base64urlJson(value: unknown): string { return Buffer.from(JSON.stringify(value), "utf8").toString("base64url"); }
function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing authentication configuration: ${name}`);
  return value;
}
async function staffByOpenId(pool: Pool, openId: string): Promise<StaffIdentity | null> {
  const [rows] = await pool.execute<StaffRow[]>(
    "SELECT id, open_id, name, email, role FROM sunsensor_staff_users WHERE open_id = ? LIMIT 1", [openId],
  );
  const user = rows[0];
  if (!user || user.role !== "staff" || !parseAllowedEmails().has(user.email.toLowerCase())) return null;
  return { id: Number(user.id), openId: user.open_id, name: user.name || user.email.split("@")[0], email: user.email, role: "staff" };
}
async function resolveStaff(request: Request, pool: Pool): Promise<StaffIdentity | null> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token || token.length < 32 || token.length > 512) return null;
  const [rows] = await pool.execute<SessionRow[]>(
    `SELECT u.id, u.open_id, u.name, u.email, u.role
       FROM sunsensor_staff_sessions s JOIN sunsensor_staff_users u ON u.id = s.staff_user_id
      WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP() AND u.role = 'staff' LIMIT 1`,
    [sha256(token)],
  );
  const user = rows[0];
  if (!user || !parseAllowedEmails().has(user.email.toLowerCase())) return null;
  return { id: Number(user.id), openId: user.open_id, name: user.name || user.email.split("@")[0], email: user.email, role: "staff" };
}
async function verifyGoogleIdToken(idToken: string, expectedNonce: string): Promise<GoogleClaims> {
  const parts = idToken.split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) throw new Error("Invalid Google identity token");
  const decode = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<string, unknown>;
  const header = decode(parts[0]) as { alg?: string; kid?: string };
  const claims = decode(parts[1]) as GoogleClaims;
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported Google identity token");
  const jwksResponse = await fetch("https://www.googleapis.com/oauth2/v3/certs", { signal: AbortSignal.timeout(10000) });
  if (!jwksResponse.ok) throw new Error("Could not verify Google identity");
  const jwks = await jwksResponse.json() as { keys?: GoogleJwk[] };
  const jwk = jwks.keys?.find((key) => key.kid === header.kid && key.use === "sig" && key.alg === "RS256");
  if (!jwk) throw new Error("Google signing key not found");
  const key = createPublicKey({ key: jwk as never, format: "jwk" });
  const validSignature = verifySignature("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], "base64url"));
  const clientId = requiredEnv("GOOGLE_CLIENT_ID");
  const audienceMatches = claims.aud === clientId || (Array.isArray(claims.aud) && claims.aud.includes(clientId));
  const now = Math.floor(Date.now() / 1000);
  if (!validSignature || !["https://accounts.google.com", "accounts.google.com"].includes(claims.iss || "") ||
      !audienceMatches || (Array.isArray(claims.aud) && claims.azp !== clientId) ||
      typeof claims.exp !== "number" || claims.exp <= now ||
      typeof claims.iat !== "number" || claims.iat > now + 60 ||
      claims.nonce !== expectedNonce || typeof claims.sub !== "string" ||
      typeof claims.email !== "string" || claims.email_verified !== true) {
    throw new Error("Google identity token validation failed");
  }
  return claims;
}
export function requestStaff(pool: Pool): RequestHandler {
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      const credential = requestCredential(request);
      const staff = await resolveStaff(request, pool);
      if (!staff) { response.status(401).json({ error: "Staff authentication required" }); return; }
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !csrfMatches(request, credential)) {
        response.status(403).json({ error: "Security check expired. Refresh the staff page and try again." }); return;
      }
      (request as StaffRequest).staff = staff;
      next();
    } catch { response.status(503).json({ error: "Staff authentication unavailable" }); }
  };
}
export function staffFrom(request: Request): StaffIdentity {
  const staff = (request as StaffRequest).staff;
  if (!staff) throw new Error("Staff identity unavailable");
  return staff;
}
export function mountAuthRoutes(app: import("express").Express, pool: Pool): void {
  app.get("/api/staff/session", async (request, response) => {
    try {
      const staff = await resolveStaff(request, pool);
      if (!staff) { response.status(401).json({ error: "Staff authentication required" }); return; }
      const credential = requestCredential(request);
      response.json({ staff: { name: staff.name, email: staff.email }, csrfToken: credential ? csrfForCredential(credential) : "" });
    } catch { response.status(503).json({ error: "Staff authentication unavailable" }); }
  });

  app.post("/api/auth/google/start", (request, response) => {
    const suppliedOrigin = validatedOrigin(request.body?.origin);
    const requestOrigin = publicRequestOrigin(request);
    if (!suppliedOrigin || !requestOrigin || requestOrigin.origin !== suppliedOrigin.origin) {
      response.status(400).json({ error: "Invalid application origin" }); return;
    }
    try {
      const clientId = requiredEnv("GOOGLE_CLIENT_ID");
      const redirectUri = `${suppliedOrigin.origin}/api/auth/google/callback`;
      const state: OAuthState = {
        state: randomBytes(32).toString("base64url"),
        nonce: randomBytes(32).toString("base64url"),
        verifier: randomBytes(48).toString("base64url"),
        redirectUri,
      };
      const challenge = createHash("sha256").update(state.verifier).digest("base64url");
      const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authorizeUrl.search = new URLSearchParams({
        client_id: clientId, redirect_uri: redirectUri, response_type: "code",
        scope: "openid email profile", state: state.state, nonce: state.nonce,
        code_challenge: challenge, code_challenge_method: "S256",
        prompt: "select_account",
      }).toString();
      setCookie(response, OAUTH_COOKIE, base64urlJson(state), suppliedOrigin.protocol === "https:", 600, "/api/auth/google/callback");
      response.json({ authorizationUrl: authorizeUrl.toString() });
    } catch { response.status(503).json({ error: "Google sign-in is not configured yet" }); }
  });

  app.post("/api/auth/logout", async (request, response) => {
    const existingToken = requestCredential(request);
    if (existingToken && !csrfMatches(request, existingToken)) {
      response.status(403).json({ error: "Security check expired. Refresh the staff page and try again." }); return;
    }
    const origin = publicRequestOrigin(request);
    clearCookie(response, SESSION_COOKIE, origin ? origin.protocol === "https:" : true, "/");
    if (existingToken && existingToken.length >= 32 && existingToken.length <= 512) {
      try { await pool.execute("DELETE FROM sunsensor_staff_sessions WHERE token_hash = ?", [sha256(existingToken)]); }
      catch { response.status(503).json({ error: "Could not end staff session" }); return; }
    }
    response.json({ ok: true });
  });

  app.get("/api/auth/google/callback", async (request, response) => {
    const rawState = request.query.state;
    const code = request.query.code;
    const oauthCookie = cookieValue(request, OAUTH_COOKIE);
    clearCookie(response, OAUTH_COOKIE, true, "/api/auth/google/callback");
    if (typeof rawState !== "string" || typeof code !== "string" || !code || !oauthCookie || rawState.length > 256) {
      response.status(400).send("Invalid Google sign-in callback."); return;
    }
    try {
      const state = JSON.parse(Buffer.from(oauthCookie, "base64url").toString("utf8")) as OAuthState;
      if (!state || state.state !== rawState || typeof state.nonce !== "string" || typeof state.verifier !== "string" ||
          typeof state.redirectUri !== "string" || !state.redirectUri.endsWith("/api/auth/google/callback")) {
        response.status(400).send("Invalid Google sign-in state."); return;
      }
      const callbackOrigin = new URL(state.redirectUri).origin;
      const clientId = requiredEnv("GOOGLE_CLIENT_ID");
      const clientSecret = requiredEnv("GOOGLE_CLIENT_SECRET");
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code, client_id: clientId, client_secret: clientSecret, redirect_uri: state.redirectUri,
          grant_type: "authorization_code", code_verifier: state.verifier,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!tokenResponse.ok) throw new Error("Google token exchange failed");
      const tokenBody = await tokenResponse.json() as { id_token?: string };
      if (!tokenBody.id_token) throw new Error("Google did not return an identity token");
      const profile = await verifyGoogleIdToken(tokenBody.id_token, state.nonce);
      const email = profile.email!.trim().toLowerCase();
      const openId = `google:${profile.sub}`;
      if (openId.length > 191 || !parseAllowedEmails().has(email)) {
        response.status(403).send("This Google account is not authorized for staff access."); return;
      }
      const name = (profile.name || email.split("@")[0]).trim().slice(0, 255);
      await pool.execute(
        `INSERT INTO sunsensor_staff_users (open_id, name, email, role) VALUES (?, ?, ?, 'staff')
         ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email), role = 'staff'`,
        [openId, name, email],
      );
      const staff = await staffByOpenId(pool, openId);
      if (!staff) { response.status(403).send("This Google account is not authorized for staff access."); return; }
      const sessionToken = randomBytes(48).toString("base64url");
      const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
      await pool.execute(
        "INSERT INTO sunsensor_staff_sessions (staff_user_id, token_hash, expires_at) VALUES (?, ?, ?)",
        [staff.id, sha256(sessionToken), expiresAt],
      );
      setCookie(response, SESSION_COOKIE, sessionToken, new URL(state.redirectUri).protocol === "https:", SESSION_TTL_SECONDS, "/");
      response.redirect(303, `${callbackOrigin}/staff`);
    } catch {
      response.status(503).send("Google sign-in could not be completed. Please return to the staff page and try again.");
    }
  });
}
