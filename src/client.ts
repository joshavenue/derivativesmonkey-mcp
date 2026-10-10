/**
 * HTTP client for www.derivativesmonkey.com.
 *
 * Hard rule: this module only ever talks to https://www.derivativesmonkey.com
 * (every URL is checked by dmUrl() before the request). It is the only network
 * module in the server. The API is the site's own undocumented, unauthenticated
 * JSON API (FastAPI), so requests are cached, rate limited and identified.
 */

import { cachedRun, fetchOnce, Semaphore, sleep, TtlCache, withRetries } from "./http.js";

export const DM_BASE_URL = (process.env.DM_BASE_URL ?? "https://www.derivativesmonkey.com").replace(/\/+$/, "");
/** The only host this module ever contacts. */
export const DM_HOST = "www.derivativesmonkey.com";

const USER_AGENT = `derivativesmonkey-mcp/${process.env.npm_package_version ?? "0.1.0"}`;
const TIMEOUT_MS = Number(process.env.DM_TIMEOUT_MS ?? 30_000);
const MAX_CONCURRENCY = Number(process.env.DM_MAX_CONCURRENCY ?? 3);
/** Minimum spacing between request starts, so a burst of tool calls stays polite. */
const MIN_INTERVAL_MS = Number(process.env.DM_MIN_INTERVAL_MS ?? 250);
const CACHE_TTL_MS = Number(process.env.DM_CACHE_TTL_MS ?? 15_000);
/** Slow-moving payloads (history, quant models, posts, expiries). */
export const LONG_TTL_MS = Number(process.env.DM_LONG_CACHE_TTL_MS ?? 5 * 60_000);
const MAX_RETRIES = 2;

export class DmError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly route: string,
    public readonly body?: unknown,
    /** True for 429/5xx, timeouts and network failures; false for other 4xx (retrying cannot help). */
    public readonly retryable: boolean = false,
    public readonly hint?: string,
  ) {
    super(message);
    this.name = "DmError";
  }
}

type Json = unknown;

/** "required": signed-in only (fails with a dm_login hint when signed out); "optional": attach the token when signed in. */
export type AuthMode = "none" | "optional" | "required";
let tokenProvider: (() => Promise<string>) | null = null;
let signedInProbe: () => boolean = () => false;
/** Wired by server.ts to src/auth.ts (kept as an injection to avoid an import cycle). */
export function setTokenProvider(fn: () => Promise<string>, isSignedIn: () => boolean): void {
  tokenProvider = fn;
  signedInProbe = isSignedIn;
}

async function authHeaders(mode: AuthMode): Promise<Record<string, string>> {
  if (mode === "none" || !tokenProvider) {
    if (mode === "required") throw new DmError("Signed-in feature but no login support configured", 401, "/auth", undefined, false);
    return {};
  }
  if (mode === "optional" && !signedInProbe()) return {};
  try {
    return { authorization: `Bearer ${await tokenProvider()}` };
  } catch (err) {
    if (mode === "required") throw err;
    return {};
  }
}

const cache = new TtlCache();
const semaphore = new Semaphore(MAX_CONCURRENCY);
let nextSlot = 0;

/** Space request starts at least MIN_INTERVAL_MS apart. */
async function pace(): Promise<void> {
  const now = Date.now();
  const at = Math.max(now, nextSlot);
  nextSlot = at + MIN_INTERVAL_MS;
  if (at > now) await sleep(at - now);
}

/** Build the absolute URL for a route and refuse anything that is not https://www.derivativesmonkey.com. */
export function dmUrl(route: string): string {
  if (!route.startsWith("/api/")) throw new DmError(`Refusing non-API route (${route})`, null, route);
  const url = `${DM_BASE_URL}${route}`;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new DmError(`Refusing malformed Derivatives Monkey URL (${route})`, null, route);
  }
  // Check the normalized path too: "/api/../auth/login" would otherwise escape the /api/ prefix.
  if (!parsed.pathname.startsWith("/api/")) throw new DmError(`Refusing non-API route (${route})`, null, route);
  if (parsed.protocol !== "https:" || parsed.host !== DM_HOST || parsed.username || parsed.password) {
    throw new DmError(`Refusing to contact ${parsed.protocol}//${parsed.host}: this client only talks to https://${DM_HOST}`, null, route);
  }
  return url;
}

/** FastAPI 422 bodies: {detail:[{loc:["query","source"],msg:"Field required"}]} -> "source: Field required". */
function describe422(body: unknown): string | null {
  const d = (body as { detail?: unknown })?.detail;
  if (typeof d === "string") return d;
  if (!Array.isArray(d)) return null;
  return d
    .map((x: any) => `${Array.isArray(x?.loc) ? x.loc.filter((p: unknown) => p !== "query" && p !== "body").join(".") : "?"}: ${x?.msg ?? "invalid"}`)
    .join("; ");
}

async function doFetch(route: string, init: RequestInit): Promise<Json> {
  const url = dmUrl(route);
  const reqInit: RequestInit = {
    ...init,
    headers: { accept: "application/json", "user-agent": USER_AGENT, ...(init.headers ?? {}) },
  };
  return withRetries<Json>(
    MAX_RETRIES,
    async () => {
      await pace();
      return fetchOnce<Json>(
        url,
        reqInit,
        TIMEOUT_MS,
        (res, text, body) => {
          if (res.ok) {
            if (typeof body === "string" && /^\s*</.test(body)) {
              // The SPA answers unknown paths with index.html: the route moved or was removed.
              return { ok: false, error: new DmError(`Derivatives Monkey returned HTML instead of JSON for ${route} (route probably changed)`, res.status, route) };
            }
            return { ok: true, value: body };
          }
          const retryable = res.status === 429 || res.status >= 500;
          const detail = res.status === 422 ? describe422(body) : null;
          const apiMsg = body && typeof body === "object" && typeof (body as { detail?: unknown }).detail === "string" ? (body as { detail: string }).detail : null;
          const msg = detail ? `Invalid parameters for ${route.split("?")[0]}: ${detail}` : (apiMsg ?? `Derivatives Monkey returned HTTP ${res.status} for ${route}`);
          const hint =
            res.status === 401 || res.status === 403
              ? "This endpoint needs a logged-in Derivatives Monkey account; the MCP server only serves public data."
              : res.status === 404
                ? "Unknown route, or no data for these parameters (e.g. an expiry or instrument that does not exist)."
                : res.status === 429
                  ? "Rate limited by Derivatives Monkey; wait before retrying."
                  : undefined;
          return { ok: false, error: new DmError(msg, res.status, route, body, retryable, hint) };
        },
        (aborted, err) =>
          new DmError(
            aborted ? `Derivatives Monkey request timed out after ${TIMEOUT_MS}ms (${route})` : `Network error reaching Derivatives Monkey (${route}): ${err.message}`,
            null,
            route,
            undefined,
            true,
          ),
      );
    },
    () => new DmError(`Derivatives Monkey request failed (${route})`, null, route),
  );
}

export type QueryValue = string | number | boolean | undefined | null;

export function buildQuery(params: Record<string, QueryValue>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

type ReqOpts = { ttlMs?: number; auth?: AuthMode };

/** GET a JSON route, e.g. get("/api/market/expiries", {source: "deribit"}). */
export async function get(route: string, params: Record<string, QueryValue> = {}, opts: ReqOpts = {}): Promise<Json> {
  const full = `${route}${buildQuery(params)}`;
  const headers = await authHeaders(opts.auth ?? "none");
  // Signed-in responses are per-user: never cached (and never served to a signed-out call).
  const key = headers.authorization ? null : `GET ${full}`;
  return cachedRun(cache, semaphore, key, opts.ttlMs ?? CACHE_TTL_MS, () => doFetch(full, { method: "GET", headers }));
}

/** POST a JSON body (compute endpoints such as the backtester). Cached briefly by body when signed out. */
export async function post(route: string, body: unknown, params: Record<string, QueryValue> = {}, opts: ReqOpts = {}): Promise<Json> {
  const full = `${route}${buildQuery(params)}`;
  const payload = JSON.stringify(body);
  const headers = await authHeaders(opts.auth ?? "none");
  const key = headers.authorization ? null : `POST ${full} ${payload}`;
  return cachedRun(cache, semaphore, key, opts.ttlMs ?? CACHE_TTL_MS, () =>
    doFetch(full, { method: "POST", body: payload, headers: { "content-type": "application/json", ...headers } }),
  );
}

export function clearCache(): void {
  cache.clear();
}
