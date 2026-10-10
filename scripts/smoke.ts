/**
 * Live health check: call every view of every dm_* tool once with default
 * arguments against www.derivativesmonkey.com and report status, latency and
 * size. Exit code 1 if any non-skipped view fails, so it works in CI/cron.
 *
 *   npm run smoke                 # all tools, asset btc
 *   npm run smoke -- --asset eth  # another asset
 *   npm run smoke -- --tool dm_gex --json
 *
 * Views marked smokeSkip need ids from another call; signed-in views are
 * reported as "needs login" unless a session exists (dm_login).
 */
import { callView } from "../src/tools/domain.js";
import { TOOLS } from "../src/views.js";
import { isLoggedInLocally } from "../src/auth.js";
import { toText } from "../src/shape.js";
import "../src/server.js"; // wires the token provider

const argv = process.argv.slice(2);
const opt = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const asset = opt("asset") ?? "btc";
const only = opt("tool");
const json = argv.includes("--json");
const signedIn = isLoggedInLocally();

type Row = { tool: string; view: string; status: "ok" | "empty" | "fail" | "skip" | "login"; ms?: number; chars?: number; error?: string };
const rows: Row[] = [];

for (const spec of TOOLS) {
  if (only && spec.name !== only) continue;
  for (const [view, v] of Object.entries(spec.views)) {
    if (v.smokeSkip) {
      rows.push({ tool: spec.name, view, status: "skip" });
      continue;
    }
    if (v.assets && !v.assets.includes(asset)) {
      rows.push({ tool: spec.name, view, status: "skip" });
      continue;
    }
    if (v.auth && !signedIn) {
      rows.push({ tool: spec.name, view, status: "login" });
      continue;
    }
    const t0 = Date.now();
    try {
      const out = (await callView(spec, { view, asset: spec.name === "dm_ibit" ? "btc" : asset })) as { data: unknown };
      const text = toText(out);
      const d = out.data;
      const empty = d == null || (Array.isArray(d) && d.length === 0) || (typeof d === "object" && !Array.isArray(d) && Object.keys(d as object).length === 0);
      rows.push({ tool: spec.name, view, status: empty ? "empty" : "ok", ms: Date.now() - t0, chars: text.length });
    } catch (err) {
      rows.push({ tool: spec.name, view, status: "fail", ms: Date.now() - t0, error: `${(err as { status?: number }).status ?? "-"} ${(err as Error).message}`.slice(0, 200) });
    }
    if (!json) {
      const r = rows[rows.length - 1];
      process.stderr.write(`${r.status.padEnd(5)} ${`${r.tool}.${r.view}`.padEnd(42)} ${String(r.ms ?? "").padStart(6)}ms ${String(r.chars ?? "").padStart(7)}ch ${r.error ?? ""}\n`);
    }
  }
}

// Chained checks for the views skipped above: take real ids from one call and feed them to the next.
if (!only && !argv.includes("--no-chained")) {
  const T = (n: string) => TOOLS.find((t) => t.name === n)!;
  const data = async (tool: string, args: Parameters<typeof callView>[1]) => ((await callView(T(tool), { asset, ...args })) as { data: any }).data;
  const check = async (tool: string, view: string, args: () => Promise<Parameters<typeof callView>[1]>) => {
    const i = rows.findIndex((r) => r.tool === tool && r.view === view);
    const t0 = Date.now();
    let row: Row;
    try {
      const out = (await callView(T(tool), { asset, ...(await args()), view })) as { data: unknown };
      const d = out.data;
      const empty = d == null || (Array.isArray(d) && d.length === 0) || (typeof d === "object" && !Array.isArray(d) && Object.keys(d as object).length === 0);
      row = { tool, view, status: empty ? "empty" : "ok", ms: Date.now() - t0, chars: toText(out).length };
    } catch (err) {
      row = { tool, view, status: "fail", ms: Date.now() - t0, error: `${(err as { status?: number }).status ?? "-"} ${(err as Error).message}`.slice(0, 200) };
    }
    if (i >= 0) rows[i] = row;
    else rows.push(row);
    if (!json) process.stderr.write(`${row.status.padEnd(5)} ${`${tool}.${view} (chained)`.padEnd(42)} ${String(row.ms ?? "").padStart(6)}ms ${String(row.chars ?? "").padStart(7)}ch ${row.error ?? ""}\n`);
  };
  try {
    const chain = await data("dm_chain", { view: "chain" });
    const spot = Number(chain?.spot ?? (await data("dm_markets", { view: "spot" }))?.spot ?? 0);
    const strikes: number[] = (chain?.rows ?? []).map((r: any) => Number(r.strike)).filter(Number.isFinite);
    const strike = strikes.reduce((b, s) => (Math.abs(s - spot) < Math.abs(b - spot) ? s : b), strikes[0]);
    const instrument: string = (await data("dm_chain", { view: "instruments", limit: 400 })).find((r: any) => Math.abs(r.strike - strike) < 1e-9 && r.option_type === "C")?.instrument;
    // trade_decode only decodes Paradigm DRFQ blocks.
    const block = ((await data("dm_blocks", { view: "trades", limit: 50 })) ?? []).find((t: any) => t.source === "paradigm_drfq" && t.legs?.length);
    await check("dm_chain", "strike_insight", async () => ({ params: { strike } }));
    await check("dm_chain", "strike_history", async () => ({ params: { strike, option_type: "C" } }));
    await check("dm_chain", "strike_events", async () => ({ params: { strike, option_type: "C" } }));
    await check("dm_chain", "strike_rfq_strategies", async () => ({ params: { strike } }));
    await check("dm_gex", "pnl_surface", async () => ({ params: { strike, option_type: "C", contracts: 1 } }));
    await check("dm_chain", "instrument_history", async () => ({ params: { instrument } }));
    await check("dm_flow", "scanner_chart", async () => ({ params: { instrument } }));
    if (block) await check("dm_blocks", "trade_decode", async () => ({ params: { rfq_id: block.rfq_id } }));
    await check("dm_blocks", "settlement_price", async () => ({}));
    await check("dm_futures", "history", async () => ({ params: { instrument: `${asset.toUpperCase()}-PERPETUAL`, source: "deribit" } }));
    await check("dm_divergence", "lead_lag_history", async () => ({ params: { source_a: "binance", source_b: "bybit", lag_seconds: 1 } }));
    if (!["btc", "eth"].includes(asset)) throw new Error("SKIP_BACKTEST");
    const meta = await data("dm_backtest", { view: "meta" });
    await check("dm_backtest", "spot_at", async () => ({ params: { ts_ms: meta.newest_ts_ms - 86_400_000 } }));
    // Backtest: an ATM call on the latest fully-covered expiry, entered 2 days before its last candle, held 1 day.
    const exp = [...meta.expiries].reverse().find((x: any) => x.last_candle_ts_ms - x.first_candle_ts_ms > 3 * 86_400_000 && x.last_candle_ts_ms < meta.newest_ts_ms);
    const leg = exp.calls.reduce((b: any, c: any) => (Math.abs(c.strike - spot) < Math.abs(b.strike - spot) ? c : b), exp.calls[0]);
    const entry = exp.last_candle_ts_ms - 2 * 86_400_000;
    await check("dm_backtest", "run", async () => ({ body: { legs: [{ instrument: leg.instrument, direction: "long" }], entry_ts_ms: entry, exit_rule: "fixed_ts", exit_ts_ms: entry + 86_400_000, fill_mode: "mark", apply_fees: false }, fields: ["entry", "exit"] }));
  } catch (err) {
    if ((err as Error).message === "SKIP_BACKTEST") {
      /* backtester is BTC/ETH only */
    } else {
    rows.push({ tool: "(chained)", view: "setup", status: "fail", error: (err as Error).message.slice(0, 200) });
    if (!json) process.stderr.write(`fail  chained setup: ${(err as Error).message}\n`);
    }
  }
}

const count = (s: Row["status"]) => rows.filter((r) => r.status === s).length;
const summary = { asset, signedIn, total: rows.length, ok: count("ok"), empty: count("empty"), fail: count("fail"), skipped: count("skip"), needsLogin: count("login"), at: new Date().toISOString() };
if (json) process.stdout.write(JSON.stringify({ summary, rows }, null, 2) + "\n");
else process.stderr.write(`\n${JSON.stringify(summary)}\n`);
process.exit(summary.fail > 0 ? 1 : 0);
