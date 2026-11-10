import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Pool, RowDataPacket } from "mysql2/promise";

const SESSION_COOKIE = "webdev_app_session";
const NONCE_COOKIE = "sunsensor_oauth_nonce";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

type StaffIdentity = { id: number; openId: string; name: string; email: string; role: "staff" };
type StaffRequest = Request & { staff?: StaffIdentity };
type OAuthState = { redirectUri: string; nonce: string };

type StaffRow = RowDataPacket & {
  id: number;
  open_id: string;
  name: string;
  email: string;
  role: string;
};

type SessionRow = StaffRow;

function parseAllowedEmails(): Set<string> {
  return new Set(
    (process.env.SUNSENSOR_STAFF_EMAILS || "")
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function cookieValue(request: Request, name: string): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function cookieFlags(isHttps: boolean, httpOnly = true): string {
  const httpOnlyFlag = httpOnly ? "; HttpOnly" : "";
  return isHttps
    ? `${httpOnlyFlag}; SameSite=None; Secure`
    : `${httpOnlyFlag}; SameSite=Lax`;
}

function setCookie(response: Response, name: string, value: string, options: {
  isHttps: boolean;
  maxAge: number;
  path: string;
  httpOnly?: boolean;
}): void {
  response.append(
    "Set-Cookie",
    `${name}=${encodeURIComponent(value)}; Path=${options.path}; Max-Age=${options.maxAge}${cookieFlags(options.isHttps, options.httpOnly !== false)}`,
  );
}

function clearCookie(
  response: Response,
  name: string,
  isHttps: boolean,
  path: string,
  httpOnly = true,
): void {
  setCookie(response, name, "", { isHttps, maxAge: 0, path, httpOnly });
}

function isLoopbackOrigin(origin: URL): boolean {
  return origin.protocol === "http:" &&
    (origin.hostname === "localhost" || origin.hostname === "127.0.0.1" || origin.hostname === "[::1]");
}

function loopbackHost(value: string | undefined): boolean {
  if (!value || value.includes(",")) return false;
  try {
    const host = new URL(`http://${value}`).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return false;
  }
}

function forwardedPublicOrigin(request: Request): URL | null {
  const host = request.get("x-forwarded-host");
  const protocol = request.get("x-forwarded-proto");
  if (!host || host.includes(",") || !protocol || protocol.includes(",") || !loopbackHost(request.get("host"))) {
    return null;
  }
  return validatedOrigin(`${protocol}://${host}`);
}

function publicRequestOrigin(request: Request): URL | null {
  const origin = validatedOrigin(request.get("origin"));
  if (!origin) return null;
  const forwarded = forwardedPublicOrigin(request);
  if (!forwarded) return origin;
  if (isLoopbackOrigin(origin)) return forwarded;
  return origin.origin === forwarded.origin ? forwarded : null;
}

function browserRequestIsHttps(request: Request): boolean {
  return publicRequestOrigin(request)?.protocol === "https:";
}

function requestCredential(request: Request): string | null {
  const injectedJwt = request.get("x-manus-jwt");
  if (injectedJwt) return injectedJwt;
  const authorization = request.get("authorization");
  if (authorization) return /^Bearer\s+([^\s]+)$/i.exec(authorization)?.[1] ?? null;
  return cookieValue(request, SESSION_COOKIE) ?? null;
}

function csrfForCredential(credential: string): string {
  return createHmac("sha256", credential)
    .update("sunsensor-staff-csrf-v1")
    .digest("base64url");
}

function requestOriginIsSafe(request: Request): boolean {
  const origin = publicRequestOrigin(request);
  if (!origin) return false;
  const referer = request.get("referer");
  if (!referer) return true;
  try {
    return new URL(referer).origin === origin.origin;
  } catch {
    return false;
  }
}

function csrfMatches(request: Request, credential: string | null): boolean {
  const header = request.get("x-sunsensor-csrf");
  if (
    !credential ||
    !requestOriginIsSafe(request) ||
    !header ||
    !/^[A-Za-z0-9_-]{43}$/.test(header)
  ) return false;
  const cookieBytes = Buffer.from(csrfForCredential(credential));
  const headerBytes = Buffer.from(header);
  return cookieBytes.length === headerBytes.length && timingSafeEqual(cookieBytes, headerBytes);
}

function validatedOrigin(value: unknown): URL | null {
  if (typeof value !== "string" || value.length > 512) return null;
  try {
    const url = new URL(value);
    if (url.origin !== value || url.username || url.password) return null;
    if (url.protocol === "https:") return url;
    if (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]")
    ) return url;
  } catch {
    return null;
  }
  return null;
}

function safeRedirectUri(value: unknown): { uri: string; origin: URL } | null {
  if (typeof value !== "string" || !value.endsWith("/api/auth/callback")) return null;
  const originText = value.slice(0, -"/api/auth/callback".length);
  const origin = validatedOrigin(originText);
  if (!origin || value !== `${origin.origin}/api/auth/callback`) return null;
  return { uri: value, origin };
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function verifyPreviewJwt(token: string): string | null {
  const secret = process.env.MANUS_JWT_SECRET;
  const projectId = process.env.MANUS_PROJECT_ID;
  if (!secret || !projectId) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const header = JSON.parse(decodeBase64Url(parts[0]).toString("utf8")) as { alg?: unknown };
    const claims = JSON.parse(decodeBase64Url(parts[1]).toString("utf8")) as {
      appId?: unknown;
      exp?: unknown;
      openId?: unknown;
    };
    if (header.alg !== "HS256" || claims.appId !== projectId) return null;
    if (typeof claims.exp !== "number" || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    if (typeof claims.openId !== "string" || !claims.openId.trim()) return null;
    const expected = createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest();
    const received = decodeBase64Url(parts[2]);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
    return claims.openId;
  } catch {
    return null;
  }
}

async function staffByOpenId(pool: Pool, openId: string): Promise<StaffIdentity | null> {
  const [rows] = await pool.execute<StaffRow[]>(
    "SELECT id, open_id, name, email, role FROM sunsensor_staff_users WHERE open_id = ? LIMIT 1",
    [openId],
  );
  const user = rows[0];
  if (!user || user.role !== "staff" || !parseAllowedEmails().has(user.email.toLowerCase())) return null;
  return {
    id: Number(user.id),
    openId: user.open_id,
    name: user.name || user.email.split("@")[0],
    email: user.email,
    role: "staff",
  };
}

async function resolveStaff(request: Request, pool: Pool): Promise<StaffIdentity | null> {
  const authorization = request.get("authorization");
  const injectedJwt = request.get("x-manus-jwt");
  if (authorization || injectedJwt) {
    let token = injectedJwt;
    if (!token) {
      const match = /^Bearer\s+([^\s]+)$/i.exec(authorization || "");
      if (!match) return null;
      token = match[1];
    }
    const openId = verifyPreviewJwt(token);
    return openId ? staffByOpenId(pool, openId) : null;
  }

  const token = cookieValue(request, SESSION_COOKIE);
  if (!token || token.length < 32 || token.length > 512) return null;
  if (token.split(".").length === 3) {
    const openId = verifyPreviewJwt(token);
    return openId ? staffByOpenId(pool, openId) : null;
  }
  const [rows] = await pool.execute<SessionRow[]>(
    `SELECT u.id, u.open_id, u.name, u.email, u.role
       FROM sunsensor_staff_sessions s
       JOIN sunsensor_staff_users u ON u.id = s.staff_user_id
      WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP() AND u.role = 'staff'
      LIMIT 1`,
    [sha256(token)],
  );
  const user = rows[0];
  if (!user || !parseAllowedEmails().has(user.email.toLowerCase())) return null;
  return {
    id: Number(user.id),
    openId: user.open_id,
    name: user.name || user.email.split("@")[0],
    email: user.email,
    role: "staff",
  };
}

function jsonObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return null;
}

function wrappedObject(value: unknown): Record<string, unknown> | null {
  const root = jsonObject(value);
  if (!root) return null;
  return jsonObject(root.data) || root;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing OAuth configuration: ${name}`);
  return value.replace(/\/$/, "");
}

async function requestManusJson(url: string, body: Record<string, string>): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Manus authentication request failed");
  return response.json();
}

export function requestStaff(pool: Pool): RequestHandler {
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      const credential = requestCredential(request);
      const staff = await resolveStaff(request, pool);
      if (!staff) {
        response.status(401).json({ error: "Staff authentication required" });
        return;
      }
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !csrfMatches(request, credential)) {
        response.status(403).json({ error: "Security check expired. Refresh the staff page and try again." });
        return;
      }
      (request as StaffRequest).staff = staff;
      next();
    } catch {
      response.status(503).json({ error: "Staff authentication unavailable" });
    }
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
      if (!staff) {
        response.status(401).json({ error: "Staff authentication required" });
        return;
      }
      response.json({
        staff: { name: staff.name, email: staff.email },
        csrfToken: requestCredential(request)
          ? csrfForCredential(requestCredential(request)!)
          : "",
      });
    } catch {
      response.status(503).json({ error: "Staff authentication unavailable" });
    }
  });

  app.post("/api/auth/start", (request, response) => {
    const suppliedOrigin = validatedOrigin(request.body?.origin);
    if (!suppliedOrigin) {
      response.status(400).json({ error: "Invalid application origin" });
      return;
    }
    const requestOrigin = publicRequestOrigin(request);
    if (!requestOrigin || requestOrigin.origin !== suppliedOrigin.origin) {
      response.status(400).json({ error: "Origin mismatch" });
      return;
    }
    try {
      const appId = process.env.MANUS_PROJECT_ID;
      if (!appId) throw new Error("Missing OAuth configuration: MANUS_PROJECT_ID");
      const portal = new URL(`${requiredEnv("MANUS_OAUTH_PORTAL_URL")}/app-auth`);
      const redirectUri = `${suppliedOrigin.origin}/api/auth/callback`;
      const state: OAuthState = { redirectUri, nonce: randomBytes(32).toString("base64url") };
      const encodedState = Buffer.from(JSON.stringify(state), "utf8").toString("base64");
      portal.search = new URLSearchParams({
        appId,
        redirectUri,
        state: encodedState,
        responseType: "code",
      }).toString();
      setCookie(response, NONCE_COOKIE, state.nonce, {
        isHttps: suppliedOrigin.protocol === "https:",
        maxAge: 10 * 60,
        path: "/api/auth/callback",
      });
      response.json({ authorizationUrl: portal.toString() });
    } catch {
      response.status(503).json({ error: "Authentication service unavailable" });
    }
  });

  app.post("/api/auth/logout", async (request, response) => {
    const existingToken = requestCredential(request);
    if (existingToken && !csrfMatches(request, existingToken)) {
      response.status(403).json({ error: "Security check expired. Refresh the staff page and try again." });
      return;
    }
    const origin = publicRequestOrigin(request);
    const isHttps = origin ? origin.protocol === "https:" : true;
    clearCookie(response, SESSION_COOKIE, isHttps, "/");
    const token = cookieValue(request, SESSION_COOKIE);
    if (token && token.length >= 32 && token.length <= 512) {
      try {
        await pool.execute("DELETE FROM sunsensor_staff_sessions WHERE token_hash = ?", [sha256(token)]);
      } catch {
        response.status(503).json({ error: "Could not end staff session" });
        return;
      }
    }
    response.json({ ok: true });
  });

  app.get("/api/auth/callback", async (request, response) => {
    const rawState = request.query.state;
    const code = request.query.code;
    if (typeof rawState !== "string" || rawState.length > 4096 || typeof code !== "string" || !code) {
      response.status(400).json({ error: "Invalid authentication callback" });
      return;
    }
    let state: OAuthState;
    try {
      const parsed = JSON.parse(Buffer.from(rawState, "base64").toString("utf8")) as unknown;
      if (
        !parsed || typeof parsed !== "object" ||
        typeof (parsed as Record<string, unknown>).redirectUri !== "string" ||
        typeof (parsed as Record<string, unknown>).nonce !== "string"
      ) throw new Error("Invalid state");
      state = parsed as OAuthState;
    } catch {
      response.status(400).json({ error: "Invalid authentication callback" });
      return;
    }

    const callbackTarget = safeRedirectUri(state.redirectUri);
    const nonce = cookieValue(request, NONCE_COOKIE);
    clearCookie(response, NONCE_COOKIE, callbackTarget?.origin.protocol === "https:", "/api/auth/callback");
    if (!callbackTarget || !nonce || nonce !== state.nonce) {
      response.status(400).json({ error: "Invalid authentication state" });
      return;
    }

    try {
      const oauthBase = requiredEnv("MANUS_OAUTH_API_URL");
      const projectId = process.env.MANUS_PROJECT_ID;
      if (!projectId) throw new Error("Missing OAuth configuration: MANUS_PROJECT_ID");
      const exchange = wrappedObject(await requestManusJson(
        `${oauthBase}/webdev.v1.WebDevAuthPublicService/ExchangeToken`,
        { clientId: projectId, grantType: "authorization_code", code, redirectUri: callbackTarget.uri },
      ));
      const accessToken = typeof exchange?.accessToken === "string" ? exchange.accessToken : "";
      if (!accessToken) throw new Error("Authentication token exchange failed");
      const profile = wrappedObject(await requestManusJson(
        `${oauthBase}/webdev.v1.WebDevAuthPublicService/GetUserInfo`,
        { accessToken },
      ));
      const openId = typeof profile?.openId === "string" ? profile.openId.trim() : "";
      const email = typeof profile?.email === "string" ? profile.email.trim().toLowerCase() : "";
      const rawName = typeof profile?.name === "string"
        ? profile.name
        : typeof profile?.displayName === "string" ? profile.displayName : "";
      const name = rawName.trim().slice(0, 255) || email.split("@")[0];
      if (!openId || openId.length > 191 || !email || email.length > 320 || !parseAllowedEmails().has(email)) {
        response.status(403).json({ error: "This account is not authorized for staff access" });
        return;
      }

      await pool.execute(
        `INSERT INTO sunsensor_staff_users (open_id, name, email, role) VALUES (?, ?, ?, 'staff')
         ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email), role = 'staff'`,
        [openId, name, email],
      );
      const staff = await staffByOpenId(pool, openId);
      if (!staff) {
        response.status(403).json({ error: "This account is not authorized for staff access" });
        return;
      }

      const sessionToken = randomBytes(48).toString("base64url");
      const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
      await pool.execute(
        "INSERT INTO sunsensor_staff_sessions (staff_user_id, token_hash, expires_at) VALUES (?, ?, ?)",
        [staff.id, sha256(sessionToken), expiresAt],
      );
      setCookie(response, SESSION_COOKIE, sessionToken, {
        isHttps: callbackTarget.origin.protocol === "https:",
        maxAge: SESSION_TTL_SECONDS,
        path: "/",
      });
      response.redirect(303, `${callbackTarget.origin.origin}/staff`);
    } catch {
      response.status(503).json({ error: "Authentication service unavailable" });
    }
  });
}
