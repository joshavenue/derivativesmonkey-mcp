import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DM_BASE_URL, DmError, get, LONG_TTL_MS, post, buildQuery, type QueryValue } from "../client.js";
import { checkVenues, coerceParam, entry, extraParams, paramSummary, resolveAsset, resolveExpiry, type ParamValue } from "../catalog.js";
import { defineTool } from "../register.js";
import { envelope, page, pick, pickRows, result, shapeInput } from "../shape.js";
import { TOOLS, type ToolSpec, type View } from "../views.js";

type Rec = Record<string, unknown>;

export type ViewArgs = {
  view: string;
  asset?: string;
  source?: string;
  sources?: string[] | string;
  expiry?: string;
  params?: Record<string, ParamValue>;
  body?: Rec;
  fields?: string[];
  limit?: number;
  offset?: number;
};

const LIST_KEYS = ["rows", "items", "points", "data", "trades", "results", "series", "bins", "events", "expiries", "candles", "bars"];

/** The main list inside a response: the array itself, a known key, or the largest top-level array. */
function mainList(data: unknown): { key: string | null; list: unknown[] } | null {
  if (Array.isArray(data)) return { key: null, list: data };
  if (!data || typeof data !== "object") return null;
  const obj = data as Rec;
  for (const k of LIST_KEYS) if (Array.isArray(obj[k])) return { key: k, list: obj[k] as unknown[] };
  let best: { key: string; list: unknown[] } | null = null;
  for (const [k, v] of Object.entries(obj)) if (Array.isArray(v) && (!best || v.length > best.list.length)) best = { key: k, list: v };
  return best;
}

/** Site page for citations: https://www.derivativesmonkey.com/{asset}/{page} (IBIT pages are top-level). */
function pageUrl(view: View, asset: string): string | undefined {
  if (!view.page) return undefined;
  return view.page.startsWith("../") ? `${DM_BASE_URL}/${view.page.slice(3)}` : `${DM_BASE_URL}/${asset}/${view.page}`;
}

/** Build the request for one view and call it. Exported for the smoke runner. */
export async function callView(spec: ToolSpec, args: ViewArgs): Promise<Rec> {
  // Agents often put the shared arguments inside `params`; lift them out.
  if (args.params) {
    const { asset, source, sources, expiry, ...rest } = args.params as Record<string, ParamValue>;
    args = {
      ...args,
      asset: args.asset ?? (asset as string | undefined),
      source: args.source ?? (source as string | undefined),
      sources: args.sources ?? (sources as string | undefined),
      expiry: args.expiry ?? (expiry as string | undefined),
      params: rest,
    };
  }
  const view = spec.views[args.view];
  if (!view) throw new DmError(`Unknown view '${args.view}' for ${spec.name}. Views: ${Object.keys(spec.views).join(", ")}`, null, null as unknown as string);
  const method = view.method ?? "GET";
  const e = entry(view.path, method);
  const names = new Set(e.params.map((p) => p.name));
  const query: Record<string, QueryValue> = {};
  const resolved: Rec = {};

  const { asset, info } = await resolveAsset(args.asset);
  if (view.assets && !view.assets.includes(asset)) {
    throw new DmError(`${spec.name} view ${args.view} supports ${view.assets.join(", ")} only (Derivatives Monkey limit), not ${asset}`, null, view.path);
  }
  if (names.has("asset") || method === "POST") query.asset = asset;

  // Venues: `source` = one venue, `sources` = list. Either spelling works for either endpoint kind.
  const listIn = Array.isArray(args.sources) ? args.sources : typeof args.sources === "string" ? args.sources.split(",") : [];
  // Option venues are validated per asset; futures/perp/spot venues are a different set, so they pass through.
  const optionVenues = !/^\/api\/(futures|orderflow|ibit)|^\/api\/market\/(spot|time-at-price|lead-lag)/.test(e.path);
  const rawVenues = [...(args.source ? [args.source] : []), ...listIn];
  const venues = optionVenues ? checkVenues(rawVenues, info, asset) : rawVenues.map((v) => v.trim().toLowerCase()).filter(Boolean);
  let single: string | undefined;
  if (names.has("source")) {
    if (venues.length > 1) throw new DmError(`View ${args.view} takes one venue (source); got ${venues.join(", ")}`, null, e.path);
    const p = e.params.find((x) => x.name === "source")!;
    single = venues[0] ?? (p.required || names.has("expiry") || view.defaultSource ? info.default_source : undefined);
    if (single) {
      query.source = single;
      if (!venues[0]) resolved.source = `${single} (default venue for ${asset})`;
    }
  }
  if (names.has("sources")) {
    const list = venues.length ? venues : view.narrowSources ? [info.default_source] : [];
    if (list.length) query.sources = list.join(",");
    resolved.sources = list.length ? list : `all ${asset} venues (${info.sources.join(", ")})`;
  }

  // Expiry: required ones default to the next listed expiry at the venue in use.
  const expiryName = names.has("expiry") ? "expiry" : names.has("expiry_date") ? "expiry_date" : null;
  if (expiryName) {
    const p = e.params.find((x) => x.name === expiryName)!;
    if (args.expiry || p.required) {
      const venue = single ?? venues[0] ?? info.default_source;
      const r = await resolveExpiry(args.expiry, asset, venue);
      query[expiryName] = r.expiry;
      if (r.auto) resolved.expiry = `${r.expiry} (next listed at ${venue}; pass expiry to change)`;
    }
  } else if (args.expiry) {
    throw new DmError(`View ${args.view} has no expiry parameter`, null, e.path);
  }

  // Extra params: only names the endpoint knows (the API silently ignores typos).
  const extras = new Map(extraParams(e).map((p) => [p.name, p]));
  const given = { ...(view.defaults ?? {}), ...(args.params ?? {}) };
  for (const [k, v] of Object.entries(given)) {
    if (k === "expiry_date" && query.expiry_date) continue;
    const p = extras.get(k);
    if (!p) {
      if (method === "POST") continue;
      throw new DmError(`Unknown param '${k}' for ${spec.name} view ${args.view}. Valid: ${[...extras.keys()].join(", ") || "(none)"}`, null, e.path);
    }
    if (v === undefined || v === null || v === "") continue;
    query[k] = coerceParam(e, p, v as ParamValue);
  }
  const missing = [...extras.values()].filter((p) => p.required && query[p.name] === undefined && !(method === "POST"));
  if (missing.length) {
    throw new DmError(
      `Missing required param(s) for ${spec.name} view ${args.view}: ${missing.map((p) => `${p.name}${p.desc ? ` (${p.desc})` : ""}${p.example !== undefined ? ` e.g. ${p.example}` : ""}`).join("; ")}`,
      null,
      e.path,
    );
  }

  const ttlMs = view.slow ? LONG_TTL_MS : undefined;
  const auth = view.auth ? "required" : "optional";
  let data: unknown;
  if (method === "POST") {
    if (!args.body) throw new DmError(`View ${args.view} needs a JSON \`body\`: ${view.desc ?? e.description ?? ""}`, null, e.path);
    const body = { asset, ...(single ? { source: single } : {}), ...args.body };
    data = await post(e.path, body, { asset }, { auth, ttlMs: 60_000 });
  } else {
    data = await get(e.path, query, { auth, ttlMs });
  }

  const extra: Rec = {};
  if (view.filterAsset && Array.isArray(data)) {
    const prefix = `${asset.toUpperCase()}-`;
    const before = data.length;
    data = data.filter((r) => typeof (r as Rec)?.instrument !== "string" || String((r as Rec).instrument).toUpperCase().startsWith(prefix));
    if (before !== (data as unknown[]).length) extra.filteredOtherAssets = before - (data as unknown[]).length;
  }

  // Shaping: limit/offset page the main list; fields pick per row (lists) or per path (objects).
  const list = mainList(data);
  if (list && (args.limit !== undefined || args.offset !== undefined)) {
    const paged = page(list.list, args, args.limit ?? 100);
    extra.paging = { list: list.key ?? "(root)", ...paged.paging };
    data = list.key === null ? paged.items : { ...(data as Rec), [list.key]: paged.items };
  }
  if (args.fields?.length) {
    const l = mainList(data);
    if (l && l.key === null) {
      const { rows, report } = pickRows(l.list, args.fields);
      data = rows;
      Object.assign(extra, report);
    } else {
      data = pick(data, args.fields);
    }
  }
  const notes = [view.caveat, e.notes && /not validated|must be|stale|empty/i.test(e.notes) ? e.notes : undefined].filter(Boolean);
  return envelope(`${e.path}${buildQuery(query)}`, data, {
    tool: spec.name,
    view: args.view,
    asset,
    ...(pageUrl(view, asset) ? { shownOn: pageUrl(view, asset) } : {}),
    ...(Object.keys(resolved).length ? { resolved } : {}),
    ...(notes.length ? { notes } : {}),
    ...extra,
  });
}

function describe(spec: ToolSpec): string {
  const lines = Object.entries(spec.views).map(([name, v]) => {
    const e = entry(v.path, v.method ?? "GET");
    const ps = paramSummary(e);
    const needsExpiry = e.params.some((p) => (p.name === "expiry" || p.name === "expiry_date") && p.required);
    const tag = [v.auth ? "SIGNED-IN" : "", v.method === "POST" ? "body" : "", needsExpiry ? "expiry" : ""].filter(Boolean).join(",");
    return `- ${name}${tag ? ` [${tag}]` : ""}: ${v.desc ?? (e.description ?? "").split(". ")[0]}${ps ? ` params: ${ps}` : ""}`;
  });
  return `${spec.intro}\nViews (params go in \`params\`; * = required; [expiry] = defaults to the next listed expiry):\n${lines.join("\n")}`;
}

export function registerDomainTools(server: McpServer): void {
  for (const spec of TOOLS) {
    const viewNames = Object.keys(spec.views) as [string, ...string[]];
    const hasPost = Object.values(spec.views).some((v) => v.method === "POST");
    defineTool(
      server,
      spec.name,
      {
        title: spec.title,
        description: describe(spec),
        inputSchema: {
          view: z.enum(viewNames).describe("Which dataset (see the list in the description)."),
          asset: z.string().optional().describe("Underlying, default btc (btc, eth, sol, hype, xrp, avax, zec, xaut, lit, pump, vvv; equities/ETFs like ibit, spy via thetadata). dm_markets view assets lists all."),
          source: z.string().optional().describe("One venue (deribit, derive, okx, bybit, binance, thalex, paradex, aevo, delta, bullish, hypercall, callput). Default: the asset's default venue where one is required."),
          sources: z.union([z.array(z.string()), z.string()]).optional().describe("Several venues for cross-venue views (array or comma list). Default: all venues for the asset."),
          expiry: z.string().optional().describe("YYYY-MM-DD (or 30OCT26). Default 'next' = first expiry after today; 'nearest' includes today (0DTE)."),
          params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().describe("View-specific params, e.g. {strike: 85000, option_type: 'C', window: '7d'}."),
          ...(hasPost ? { body: z.record(z.string(), z.unknown()).optional().describe("JSON body for POST views (see the view's description).") } : {}),
          ...shapeInput,
        },
      },
      async (args: ViewArgs) => result(await callView(spec, args)),
    );
  }
}
