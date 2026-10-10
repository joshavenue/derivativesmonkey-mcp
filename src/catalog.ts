/**
 * The live-verified endpoint catalog (src/endpoints.json, produced by mapping
 * the site's JS bundle and probing every route) plus the resolution rules that
 * turn a tool call into a valid request: asset casing, the per-asset default
 * venue, the nearest expiry, option-type spelling and parameter checks.
 */
import catalogJson from "./endpoints.json" with { type: "json" };
import { DmError, get, LONG_TTL_MS } from "./client.js";

export type CatalogParam = { name: string; type?: string; required?: boolean; default?: unknown; allowed?: unknown[]; desc?: string; example?: unknown };
export type CatalogEntry = {
  path: string;
  method: string;
  group?: string;
  description?: string;
  notes?: string;
  pages?: string[];
  auth_required?: boolean;
  status?: number;
  latency_ms?: number;
  size_bytes?: number;
  response_shape?: string;
  params: CatalogParam[];
  request_body?: unknown;
};

export const CATALOG: CatalogEntry[] = catalogJson as CatalogEntry[];
const BY_PATH = new Map(CATALOG.map((e) => [`${e.method} ${e.path}`, e]));

/** Account/write routes the server never calls, even through dm_query. */
export const EXCLUDED_PREFIXES = ["/api/user", "/api/auth", "/api/positions", "/api/alerts", "/api/poster", "/api/feedback"];

export function entry(path: string, method = "GET"): CatalogEntry {
  const e = BY_PATH.get(`${method} ${path}`);
  if (!e) throw new DmError(`Unknown endpoint ${method} ${path}`, null, path);
  return e;
}

/** Params the caller may pass in `params` (everything except the ones the tool resolves itself). */
export const RESOLVED = new Set(["asset", "source", "sources", "expiry"]);
export function extraParams(e: CatalogEntry): CatalogParam[] {
  return e.params.filter((p) => !RESOLVED.has(p.name));
}

// ---------------------------------------------------------------- assets & venues

type AssetInfo = { sources: string[]; default_source: string };
export async function assetsCatalog(): Promise<Record<string, AssetInfo>> {
  const data = (await get("/api/market/sources-all", {}, { ttlMs: LONG_TTL_MS })) as { assets?: Record<string, AssetInfo> };
  return data.assets ?? {};
}

export async function resolveAsset(raw: string | undefined): Promise<{ asset: string; info: AssetInfo }> {
  const asset = (raw ?? "btc").trim().toLowerCase().replace(/^\$/, "");
  const all = await assetsCatalog();
  const info = all[asset];
  if (!info) {
    const near = Object.keys(all).filter((a) => a.startsWith(asset.slice(0, 2))).slice(0, 10);
    throw new DmError(`Unknown asset '${asset}'. Known: ${Object.keys(all).sort().join(", ")}`, null, "/api/market/sources-all", undefined, false, near.length ? `Did you mean ${near.join(" / ")}?` : undefined);
  }
  return { asset, info };
}

export function checkVenues(venues: string[], info: AssetInfo, asset: string): string[] {
  const out = venues.map((v) => v.trim().toLowerCase()).filter(Boolean);
  const bad = out.filter((v) => !info.sources.includes(v));
  if (bad.length) throw new DmError(`Venue(s) ${bad.join(", ")} do not list ${asset.toUpperCase()} options. Venues for ${asset}: ${info.sources.join(", ")}`, null, "/api/market/sources-all");
  return out;
}

// ---------------------------------------------------------------- expiries

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** Accept 2026-10-11, 11OCT26 or 20261011 and return YYYY-MM-DD. */
export function normalizeExpiry(raw: string): string {
  const s = raw.trim().toUpperCase();
  if (ISO.test(s)) return s;
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  const m = /^(\d{1,2})([A-Z]{3})(\d{2})$/.exec(s);
  if (m && MONTHS.includes(m[2])) return `20${m[3]}-${String(MONTHS.indexOf(m[2]) + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  throw new DmError(`Expiry '${raw}' not understood: use YYYY-MM-DD (e.g. 2026-10-30), 30OCT26, 'nearest' or 'next'`, null, "/api/market/expiries");
}

export async function listExpiries(asset: string, source: string): Promise<string[]> {
  const data = (await get("/api/market/expiries", { source, asset }, { ttlMs: 60_000 })) as { expiries?: string[] };
  return (data.expiries ?? []).filter((e) => ISO.test(e)).sort();
}

/**
 * Resolve the expiry keyword: nothing/'next' = first expiry after today (UTC),
 * 'nearest'/'0dte' = first expiry on or after today. Explicit dates are checked
 * against the venue's list so a typo fails loudly instead of returning nothing.
 */
export async function resolveExpiry(raw: string | undefined, asset: string, source: string): Promise<{ expiry: string; auto: boolean; available: string[] }> {
  const available = await listExpiries(asset, source);
  const today = new Date().toISOString().slice(0, 10);
  const key = (raw ?? "next").trim().toLowerCase();
  if (key === "next" || key === "nearest" || key === "0dte") {
    const pick = key === "next" ? (available.find((e) => e > today) ?? available.find((e) => e >= today)) : available.find((e) => e >= today);
    if (!pick) throw new DmError(`No upcoming ${asset.toUpperCase()} expiries listed at ${source}`, null, "/api/market/expiries");
    return { expiry: pick, auto: true, available };
  }
  const expiry = normalizeExpiry(raw!);
  if (available.length && !available.includes(expiry)) {
    throw new DmError(`${asset.toUpperCase()} has no ${expiry} expiry at ${source}. Listed: ${available.join(", ")}`, null, "/api/market/expiries", undefined, false, "Pass one of the listed dates, or 'next'. A different venue may list it (dm_markets view expiries).");
  }
  return { expiry, auto: false, available };
}

// ---------------------------------------------------------------- params

export type ParamValue = string | number | boolean;

/** Coerce and validate one extra param against the catalog (enum, numbers, option-type spelling). */
export function coerceParam(e: CatalogEntry, p: CatalogParam, value: ParamValue): ParamValue {
  if (p.name === "option_type" || p.name === "contract_type") {
    const v = String(value).trim().toLowerCase();
    const isCall = v === "c" || v === "call" || v === "calls";
    const isPut = v === "p" || v === "put" || v === "puts";
    if (!isCall && !isPut) throw new DmError(`option_type must be C/P (or call/put), got '${value}'`, null, e.path);
    const words = e.path === "/api/market/pnl-surface" || p.name === "contract_type";
    return words ? (isCall ? "call" : "put") : isCall ? "C" : "P";
  }
  const allowed = (p.allowed ?? []).filter((a) => typeof a === "string" && !/[?(]/.test(a)) as string[];
  if (allowed.length && typeof value === "string" && !allowed.includes(value)) {
    throw new DmError(`${p.name} must be one of ${allowed.join(", ")} for ${e.path} (got '${value}')`, null, e.path);
  }
  if (/^(int|float|number)/.test(p.type ?? "") && typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return value;
}

/** One-line param summary for tool descriptions: `strike*, window(24h|7d)`. */
export function paramSummary(e: CatalogEntry): string {
  return extraParams(e)
    .map((p) => {
      const allowed = (p.allowed ?? []).filter((a) => typeof a === "string" && !/[?(]/.test(a));
      return `${p.name}${p.required ? "*" : ""}${allowed.length && allowed.length <= 6 ? `(${allowed.join("|")})` : ""}`;
    })
    .join(", ");
}
