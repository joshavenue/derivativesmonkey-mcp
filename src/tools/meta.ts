import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DmError, get } from "../client.js";
import { CATALOG, EXCLUDED_PREFIXES, paramSummary } from "../catalog.js";
import { authStatus, isLoggedInLocally, login, logout } from "../auth.js";
import { defineTool } from "../register.js";
import { envelope, result, shapeInput } from "../shape.js";
import { NOT_SERVED, TOOLS } from "../views.js";

export const CONVENTIONS = {
  assets: "Lowercase symbols. Default btc. Crypto: btc, eth, sol, hype, xrp, avax, zec, xaut, lit, pump, vvv; equities/ETFs (ibit, spy, qqq, nvda, tsla, ...) come from ThetaData.",
  venues: "Lowercase: deribit, derive, okx, bybit, binance, thalex, paradex, aevo, delta, bullish, hypercall, callput (+ coincall, thetadata). Default venue per asset: deribit for btc/eth/sol/xrp/avax, derive for hype/zec/xaut/lit/pump/vvv. XAUT has no Deribit chain.",
  expiries: "YYYY-MM-DD. Tools default to the next listed expiry at the venue in use and say so in `resolved`.",
  units: "Crypto IV in percent points (45.2 = 45.2%); IBIT chain IV is a fraction. Deribit/OKX BTC/ETH option prices are in coin. Funding funding_rate_8h and apr_pct are percents. Timestamps *_ms are epoch ms UTC; heatmap `times` arrays are epoch seconds.",
  skewSign: "Risk-reversal sign differs between pages (Skew: call minus put; Tail Strike and docs: put minus call). Always state the convention.",
  gex: "GEX/DEX/VEX are model estimates from open interest with an assumed dealer side, not observed dealer books. Cross-venue and single-venue values differ.",
};

export const KNOWN_ISSUES = [
  "Paradigm Telegram feed (dm_blocks tg_* views) has no data after 19 Jul 2026.",
  "IV-percentile screener rows were seen listing only expired expiries; check dates.",
  "Vol Regime page is 'under construction'; the signed-in /api/quant/regime may still answer.",
  "Backtest data starts ~6 Jul 2026; fill_mode 'bidask' has returned HTTP 500.",
  "gex-profile can be empty for single venues; empty means no data, not zero gamma.",
  "/api/market/orderbook returns 404 for every instrument.",
];

function coverage(topic?: string) {
  const pages: Record<string, string[]> = {};
  for (const t of TOOLS) for (const [v, spec] of Object.entries(t.views)) if (spec.page) (pages[spec.page] ??= []).push(`${t.name} view ${v}`);
  const tools = TOOLS.map((t) => ({ tool: t.name, title: t.title, views: Object.keys(t.views) }));
  const q = topic?.trim().toLowerCase();
  const matches = q
    ? TOOLS.flatMap((t) =>
        Object.entries(t.views)
          .filter(([v, s]) => `${t.name} ${t.title} ${v} ${s.desc ?? ""} ${s.page ?? ""} ${s.path}`.toLowerCase().includes(q))
          .map(([v, s]) => ({ tool: t.name, view: v, desc: s.desc, signedIn: Boolean(s.auth), endpoint: s.path })),
      )
    : undefined;
  return {
    site: "https://www.derivativesmonkey.com (free crypto options analytics; most data needs no account)",
    signedIn: isLoggedInLocally(),
    ...(q ? { topic, matches, servedByThisServer: (matches?.length ?? 0) > 0, notServedMatches: Object.entries(NOT_SERVED).filter(([k, v]) => `${k} ${v}`.toLowerCase().includes(q)) } : {}),
    tools,
    sitePagesToTools: pages,
    conventions: CONVENTIONS,
    notServed: NOT_SERVED,
    knownSiteIssues: KNOWN_ISSUES,
  };
}

export { coverage as getCoverage };

export function registerMetaTools(server: McpServer): void {
  defineTool(
    server,
    "dm_coverage",
    {
      title: "What this server covers",
      description:
        "Map of every dm_* tool and view, which site page each one mirrors, conventions (assets, venues, expiries, units, skew sign), known site issues and what is not served. Pass `topic` (e.g. 'gamma flip', 'funding', 'block', 'max pain') to find the tool/view for a question.",
      inputSchema: { topic: z.string().optional().describe("Free-text topic to search tools/views for.") },
      openWorld: false,
    },
    async (args: { topic?: string }) => result(coverage(args.topic)),
  );

  defineTool(
    server,
    "dm_query",
    {
      title: "Call any catalogued endpoint",
      description:
        "Escape hatch: GET any endpoint in the live-verified catalog by path (e.g. /api/rfq/tg/big-blocks) with raw query params. Prefer the dm_* domain tools (they resolve venues/expiries and check params). Pass `path` without params to see the endpoint's parameters and response shape. Account/write routes are refused.",
      inputSchema: {
        path: z.string().describe("Endpoint path starting with /api/, as listed by dm_query with path '/api' (list) or in dm_coverage."),
        query: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().describe("Raw query params (sources must be lowercase)."),
        describeOnly: z.boolean().optional().describe("Return the catalog entry instead of calling it."),
        ...shapeInput,
      },
    },
    async (args: { path: string; query?: Record<string, string | number | boolean>; describeOnly?: boolean; fields?: string[] }) => {
      const path = args.path.split("?")[0].replace(/\/+$/, "");
      if (path === "/api" || path === "") {
        return result({ endpoints: CATALOG.filter((e) => e.method === "GET" && !EXCLUDED_PREFIXES.some((p) => e.path.startsWith(p))).map((e) => `${e.path}${e.auth_required ? " [signed-in]" : ""} ${paramSummary(e)}`) });
      }
      if (EXCLUDED_PREFIXES.some((p) => path.startsWith(p))) throw new DmError(`Refused: ${path} is an account/write route`, null, path);
      const e = CATALOG.find((x) => x.path === path && x.method === "GET");
      if (!e) throw new DmError(`${path} is not a catalogued GET endpoint`, null, path, undefined, false, "Call dm_query with path '/api' to list them.");
      if (args.describeOnly || !args.query) {
        if (args.describeOnly || e.params.some((p) => p.required)) return result({ ...e, hint: "Call again with `query` to fetch it." });
      }
      const data = await get(path, args.query ?? {}, { auth: e.auth_required ? "required" : "optional" });
      return result(envelope(path, data, { notes: e.notes ? [e.notes] : undefined }));
    },
  );

  defineTool(
    server,
    "dm_login",
    {
      title: "Sign in to Derivatives Monkey",
      description:
        "Opens a browser window on derivativesmonkey.com/btc/strategy and clicks SIGN IN; the USER then signs in themselves (Google/email). Credentials never pass through this server or the agent. Waits up to 5 min, then saves the session locally (0600) so [SIGNED-IN] views work (dm_quant regime/direction/diagnostics/anomalies, dm_markets venue_uptime). Tokens then renew automatically. Tell the user a window is opening and to sign in there. Public tools never need this.",
      inputSchema: { timeoutSeconds: z.number().int().min(30).max(900).optional().describe("How long to wait for the sign-in (default 300).") },
      openWorld: true,
    },
    async (args: { timeoutSeconds?: number }) => result(await login(args.timeoutSeconds ? args.timeoutSeconds * 1000 : undefined)),
  );

  defineTool(
    server,
    "dm_auth_status",
    { title: "Sign-in status", description: "Whether a Derivatives Monkey session is saved and valid (email, role, token expiry). Refreshes the token if needed.", inputSchema: {} },
    async () => result(await authStatus()),
  );

  defineTool(
    server,
    "dm_logout",
    {
      title: "Sign out",
      description: "Delete the locally saved Derivatives Monkey session. `forgetBrowser: true` also deletes the dedicated browser profile (next dm_login starts fresh).",
      inputSchema: { forgetBrowser: z.boolean().optional() },
      openWorld: false,
    },
    async (args: { forgetBrowser?: boolean }) => result(logout(args.forgetBrowser)),
  );
}

