/**
 * Optional login for Derivatives Monkey (unlocks the signed-in-only features).
 *
 * The site keeps its own server-side session: after a sign-in it sets an
 * httpOnly cookie on www.derivativesmonkey.com, and `POST /auth/refresh` with
 * that cookie returns `{access_token}` (a JWT the API accepts as a Bearer token).
 *
 * The password never passes through this server. `dm_login` opens a real,
 * visible browser window (the user's installed Chrome, with a dedicated
 * profile) where the user signs in themselves; we only watch for the site's own
 * auth responses, then keep the session cookies in a 0600 file. When the
 * cookie cannot be refreshed (e.g. an auth flow that does not set one), the
 * Bearer token seen in the browser is kept until it expires.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { DM_BASE_URL, DM_HOST, DmError } from "./client.js";

export const CONFIG_DIR = process.env.DM_CONFIG_DIR ?? join(homedir(), ".config", "derivativesmonkey-mcp");
const SESSION_FILE = join(CONFIG_DIR, "session.json");
const PROFILE_DIR = join(CONFIG_DIR, "browser-profile");
const LOGIN_TIMEOUT_MS = Number(process.env.DM_LOGIN_TIMEOUT_MS ?? 5 * 60_000);

type StoredCookie = { name: string; value: string; path?: string; expires?: number };
type Session = {
  cookies: StoredCookie[];
  /** Last token seen; used directly when the cookie cannot be refreshed. */
  bearer?: string;
  savedAtIso: string;
};
export type Claims = { email?: string; role?: string; sub?: string; origin?: string; exp?: number; iss?: string };

let token: { value: string; exp: number } | null = null;

/** Decode a JWT payload without verifying it (the API verifies; we only read exp/email/role). */
export function decodeJwt(jwt: string): Claims {
  try {
    const part = jwt.split(".")[1] ?? "";
    return JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch {
    return {};
  }
}

function readSession(): Session | null {
  try {
    return JSON.parse(readFileSync(SESSION_FILE, "utf8")) as Session;
  } catch {
    return null;
  }
}

function writeSession(s: Session): void {
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(SESSION_FILE, JSON.stringify(s, null, 2), { mode: 0o600 });
  chmodSync(SESSION_FILE, 0o600);
}

const cookieHeader = (cookies: StoredCookie[]) => cookies.map((c) => `${c.name}=${c.value}`).join("; ");

/** Apply Set-Cookie headers from a refresh response (the site may rotate its refresh cookie). */
function applySetCookies(cookies: StoredCookie[], res: Response): StoredCookie[] {
  const set = typeof (res.headers as any).getSetCookie === "function" ? ((res.headers as any).getSetCookie() as string[]) : [];
  if (set.length === 0) return cookies;
  const out = new Map(cookies.map((c) => [c.name, c]));
  for (const line of set) {
    const [pair, ...attrs] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    const maxAge = attrs.map((a) => a.trim()).find((a) => /^max-age=/i.test(a));
    if (value === "" || (maxAge && Number(maxAge.split("=")[1]) <= 0)) out.delete(name);
    else out.set(name, { name, value, path: out.get(name)?.path ?? "/" });
  }
  return [...out.values()];
}

/** POST /auth/refresh with the stored cookies; returns a fresh access token or null if the session is gone. */
async function refreshWithCookies(session: Session): Promise<string | null> {
  if (session.cookies.length === 0) return null;
  const res = await fetch(`${DM_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { cookie: cookieHeader(session.cookies), accept: "application/json", origin: DM_BASE_URL, referer: `${DM_BASE_URL}/` },
  });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as { access_token?: string } | null;
  if (!body?.access_token) return null;
  writeSession({ ...session, cookies: applySetCookies(session.cookies, res), bearer: body.access_token, savedAtIso: new Date().toISOString() });
  return body.access_token;
}

export function isLoggedInLocally(): boolean {
  return existsSync(SESSION_FILE);
}

/**
 * A valid access token, refreshing it when it is within 60 s of expiry.
 * Throws a DmError (status 401) with a hint to run dm_login when there is no usable session.
 */
export async function getAccessToken(): Promise<string> {
  const now = Date.now() / 1000;
  if (token && token.exp - 60 > now) return token.value;
  const session = readSession();
  if (!session) throw new DmError("Not signed in to Derivatives Monkey", 401, "/auth/refresh", undefined, false, "Call dm_login: it opens a browser window where the user signs in themselves.");
  const usable = (t: string | null | undefined) => Boolean(t) && (decodeJwt(t!).exp ?? now + 300) - 30 > now;
  let candidate: string | null = (await refreshWithCookies(session).catch(() => null)) ?? session.bearer ?? null;
  if (!usable(candidate) && (await silentRenew())) candidate = readSession()?.bearer ?? null;
  if (!usable(candidate)) {
    token = null;
    throw new DmError("Derivatives Monkey session expired", 401, "/auth/refresh", undefined, false, "Call dm_login: the user signs in again in the browser window.");
  }
  const exp = decodeJwt(candidate!).exp ?? now + 300;
  token = { value: candidate!, exp };
  return candidate!;
}

export async function authStatus(): Promise<Record<string, unknown>> {
  const session = readSession();
  if (!session) return { signedIn: false, hint: "Public tools work without signing in. Call dm_login to unlock signed-in-only features." };
  try {
    const t = await getAccessToken();
    const c = decodeJwt(t);
    return {
      signedIn: true,
      ...(c.email ? { email: c.email } : {}),
      ...(c.role ? { role: c.role } : {}),
      identityProvider: (c as { iss?: string }).iss ?? null,
      tokenExpiresIso: c.exp ? new Date(c.exp * 1000).toISOString() : null,
      renewal: "automatic: the site's refresh cookie if present, otherwise a headless sign-in with the remembered browser profile; dm_login if both fail",
      sessionSavedAtIso: session.savedAtIso,
    };
  } catch (err) {
    return { signedIn: false, error: (err as Error).message, hint: (err as DmError).hint ?? null };
  }
}

/** Forget the local session (the browser profile is kept unless `forgetBrowser`). */
export function logout(forgetBrowser = false): Record<string, unknown> {
  token = null;
  const had = existsSync(SESSION_FILE);
  rmSync(SESSION_FILE, { force: true });
  if (forgetBrowser) rmSync(PROFILE_DIR, { recursive: true, force: true });
  return { signedOut: true, removedSession: had, removedBrowserProfile: forgetBrowser };
}

/** Browsers tried in order: installed Chrome, Brave, then Playwright's own Chromium. */
const BROWSERS: Array<{ label: string; opts: Record<string, unknown> }> = [
  { label: "Google Chrome", opts: { channel: "chrome" } },
  { label: "Brave", opts: { executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" } },
  { label: "Playwright Chromium", opts: {} },
];

type BrowserRun = { ok: boolean; reason?: string; browser: string };

/**
 * Open the dedicated browser profile on /btc/strategy (the only page with a
 * sign-in entry), click its SIGN IN button, and wait until the site's own auth
 * succeeds: a Bearer token on an API request, or /auth/login|refresh|sync
 * answering. Visible for dm_login (the user types their credentials there);
 * headless for silent renewal, which only works while the identity provider
 * still remembers the user (no credentials are ever entered by this code).
 */
async function browserSignIn(headless: boolean, timeoutMs: number): Promise<BrowserRun> {
  let pw: typeof import("playwright-core");
  try {
    pw = await import("playwright-core");
  } catch {
    throw new DmError("Signing in needs the optional dependency playwright-core (npm install playwright-core)", null, "/auth/login");
  }
  mkdirSync(PROFILE_DIR, { recursive: true, mode: 0o700 });
  let context: import("playwright-core").BrowserContext | null = null;
  let used = "";
  const errors: string[] = [];
  for (const b of BROWSERS) {
    try {
      context = await pw.chromium.launchPersistentContext(PROFILE_DIR, { headless, viewport: null, ...b.opts });
      used = b.label;
      break;
    } catch (err) {
      errors.push(`${b.label}: ${(err as Error).message.split("\n")[0]}`);
    }
  }
  if (!context) throw new DmError(`Could not open a browser for sign-in (${errors.join("; ")})`, null, "/auth/login");

  let bearer: string | undefined;
  let done: (() => void) | null = null;
  const signedIn = new Promise<void>((r) => (done = r));
  const isAuthUrl = (u: string) => {
    try {
      const p = new URL(u);
      return p.host === DM_HOST && /^\/(auth\/login|auth\/refresh|api\/auth\/sync)$/.test(p.pathname);
    } catch {
      return false;
    }
  };
  context.on("request", (req) => {
    try {
      if (new URL(req.url()).host !== DM_HOST) return;
      const h = req.headers()["authorization"];
      if (h?.startsWith("Bearer ")) {
        bearer = h.slice(7);
        done?.();
      }
    } catch {
      /* ignore */
    }
  });
  context.on("response", async (res) => {
    if (!isAuthUrl(res.url()) || !res.ok()) return;
    try {
      const body = (await res.json()) as { access_token?: string };
      if (body?.access_token) bearer = body.access_token;
    } catch {
      /* /api/auth/sync answers {role}; the Bearer header was captured from its request */
    }
    if (bearer) done?.();
  });

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(`${DM_BASE_URL}/btc/strategy`).catch(() => {});
  // Click the pop-up's SIGN IN (a navigation to the identity provider; nothing is typed).
  void page
    .getByRole("button", { name: /^sign in$/i })
    .first()
    .click({ timeout: 15_000 })
    .catch(() => {});
  const closed = new Promise<void>((r) => context!.on("close", () => r()));
  const timer = new Promise<"timeout">((r) => setTimeout(() => r("timeout"), timeoutMs));
  const outcome = await Promise.race([signedIn.then(() => "ok" as const), closed.then(() => "closed" as const), timer]);

  if (outcome !== "ok") {
    await context.close().catch(() => {});
    return { ok: false, browser: used, reason: outcome === "closed" ? "The browser window was closed before signing in." : `No sign-in within ${Math.round(timeoutMs / 1000)} s.` };
  }
  await new Promise((r) => setTimeout(r, 1500)); // let the site finish setting its cookies
  const cookies = (await context.cookies(DM_BASE_URL)).map((c) => ({ name: c.name, value: c.value, path: c.path, expires: c.expires }));
  // Close before any refresh of ours so the page cannot rotate a cookie underneath us.
  await context.close().catch(() => {});
  writeSession({ cookies, bearer, savedAtIso: new Date().toISOString() });
  token = null;
  return { ok: true, browser: used };
}

/** Visible sign-in for dm_login: the user completes the identity provider's form themselves. */
export async function login(timeoutMs = LOGIN_TIMEOUT_MS): Promise<Record<string, unknown>> {
  const run = await browserSignIn(false, timeoutMs);
  if (!run.ok) return { signedIn: false, reason: run.reason, browser: run.browser };
  return { ...(await authStatus()), browser: run.browser, note: "Session saved locally (0600). Credentials were entered only in the browser window." };
}

let renewing: Promise<boolean> | null = null;
/** Headless renewal through the remembered identity-provider session; false if the user must sign in again. */
export function silentRenew(): Promise<boolean> {
  if (process.env.DM_NO_SILENT_RENEW === "1") return Promise.resolve(false);
  renewing ??= browserSignIn(true, 45_000)
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      renewing = null;
    });
  return renewing;
}
