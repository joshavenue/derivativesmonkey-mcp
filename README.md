# derivativesmonkey-mcp

Unofficial. Not affiliated with Derivatives Monkey.


MCP server for [Derivatives Monkey](https://www.derivativesmonkey.com), a free crypto options analytics site. It gives AI agents read-only tools for what the site shows: option chains, IV term structure, smile and skew, realized vol and vol indices, dealer gamma (GEX) and greeks, open interest, options flow, block/RFQ trades, cross-venue divergence, futures basis and funding, perp order flow, quant vol models, strategy ideas, IBIT options and a backtester. It covers 12 crypto venues plus US equity/ETF options via ThetaData.

The server calls the site's own JSON API (undocumented, mapped from its web app and verified live). It talks only to `https://www.derivativesmonkey.com`, caches responses, spaces requests at least 250 ms apart and runs at most 3 at once.

## Install

```bash
git clone https://github.com/joshavenue/derivativesmonkey-mcp.git
cd derivativesmonkey-mcp
npm install
npm run build
claude mcp add derivativesmonkey -s user -- node "$PWD/dist/index.js"
```

`playwright-core` is an optional dependency, used only by `dm_login`.

Other clients: run `node dist/index.js` over stdio, or `node dist/index.js --http --port 8787` for Streamable HTTP at `/mcp`.

## Tools

Every domain tool takes `view` plus shared `asset` (default btc), `source` / `sources` (venues), `expiry` (default: next listed expiry) and view-specific `params`. Results include `source` (the API call), `shownOn` (the site page), `fetchedAtIso`, `resolved` (defaults that were filled in) and `notes` (units, sign conventions, known data issues).

| Tool | What |
| --- | --- |
| `dm_coverage` | Map of tools/views/pages, conventions, known issues; `topic` search |
| `dm_markets` | Assets and venues, expiries, spot, headline stats (walls, put/call) |
| `dm_chain` | Chains per venue or merged, instrument history, Strike Insight |
| `dm_iv` | Term structure, smile, surface history, IV percentile/crush, VRP |
| `dm_skew` | 25d risk reversal by maturity, history, wings, tail-risk gauge |
| `dm_realized_vol` | Vol cone, weekly variance, implied ranges/probabilities, DVOL, MBVI |
| `dm_gex` | GEX by strike, gamma flip, dealer DEX/VEX, vanna/charm/higher greeks, P&L surfaces |
| `dm_open_interest` | OI by strike/expiry/type, max pain, OI change, put/call history |
| `dm_flow` | Trade tape, buy/sell flow, net premium, fresh positioning, 0DTE, movers |
| `dm_blocks` | Block/RFQ ledger, stats, whales, strategy mix, net delta, trade decode |
| `dm_divergence` | Cross-venue IV/basis/gamma divergence, freshness, arb candidates, lead-lag |
| `dm_futures` | Futures basis/APR, funding now and history, futures history |
| `dm_orderflow` | Footprint, CVD, volume delta, TPO, liquidations, liquidity heatmap, candles |
| `dm_quant` | SVI, Heston, Merton jump, rough vol; signed in: regime, direction, anomalies |
| `dm_strategy` | Ranked strategy ideas per bias (one expiry or cross-expiry scan) |
| `dm_ibit` | IBIT ETF options: chain, dealer GEX, flow, IV rank, VRP, IBIT-BTC IV spread |
| `dm_backtest` | Backtester catalogue and runs (POST body) |
| `dm_query` | Escape hatch: any catalogued GET endpoint with raw params |
| `dm_login`, `dm_auth_status`, `dm_logout` | Optional sign-in for `[SIGNED-IN]` views |

The agent guide (tool picking, units, workflows) is [skills/derivativesmonkey/SKILL.md](skills/derivativesmonkey/SKILL.md). The server also serves it as the `dm_guide` prompt and the `dm://guide` resource.

## Signing in (optional)

Almost everything is public, and you do not need an account. The site hides its sign-in: the only entry is the "Sign in required" pop-up on `/btc/strategy`. Signed-in views: `dm_quant` regime/direction/diagnostics/anomalies (verified 2026-10-10), `dm_markets` venue_uptime, and `dm_backtest` v2_meta/v2_hedge (v2_meta returned HTTP 500 upstream on 2026-10-10).

`dm_login` opens a Chrome window (falling back to Brave, then Playwright Chromium) on `/btc/strategy` with a dedicated profile in `~/.config/derivativesmonkey-mcp/browser-profile`, and clicks the pop-up's SIGN IN. You finish the sign-in there yourself (Google, email, ...); credentials never pass through the server. When the site makes its first authenticated call, the server saves the token and site cookies to `~/.config/derivativesmonkey-mcp/session.json` (mode 0600) and closes the window.

Renewal is automatic. Accounts that sign in with email/password get the site's refresh cookie (`POST /auth/refresh`). Auth0/Google accounts get a 24-hour token. When it expires, the server reopens the same profile headless and clicks SIGN IN again (about 4 s), which works as long as the identity provider still remembers you. Set `DM_NO_SILENT_RENEW=1` to turn that off. If renewal fails, the tools return a 401 with the hint to call `dm_login` again. `dm_logout` deletes the session; `forgetBrowser: true` also deletes the profile. Signed-in responses are never cached.

Do not expose the HTTP transport beyond localhost while signed in: anyone who can reach it would use your session.

## Reliability

- `npm run smoke` calls every view live, chaining real ids for views that need them (strike, instrument, rfq_id, backtest legs). It exits 1 on any failure. Use `--asset eth`, `--tool dm_gex` or `--json`.
- `npm test` runs offline checks: views vs catalog, param spelling, expiry parsing, host allowlist.
- 2026-10-10 live run, 0 failures on every asset: btc 141 OK and eth 141 OK (1 empty: the stale Telegram feed); hype 137 OK and xaut 137 OK. The hype and xaut views not run are the backtester (BTC/ETH only), signed-in views, and views that need data those assets lack (no Paradigm blocks to decode, no movers).
- When the site changes a route, the affected view fails with the route name, and `dm_query` / `src/endpoints.json` show the old contract. Remap with the recon notes in [docs/recon/](docs/recon/).

## Environment

`DM_TIMEOUT_MS` (30000), `DM_MAX_CONCURRENCY` (3), `DM_MIN_INTERVAL_MS` (250), `DM_CACHE_TTL_MS` (15000), `DM_LONG_CACHE_TTL_MS` (300000), `DM_MAX_RESULT_CHARS` (40000), `DM_TOOLS` (comma list with `*` wildcards to register a subset), `DM_CONFIG_DIR`, `DM_LOGIN_TIMEOUT_MS`, `DM_NO_SILENT_RENEW`. `npm run login` runs the sign-in from a terminal.

## Layout

- `src/endpoints.json`: live-verified API catalog (172 endpoints: params, shapes, auth)
- `src/views.ts`: tool → view → endpoint map with caveats
- `src/catalog.ts`: asset/venue/expiry resolution, param checks
- `src/tools/domain.ts`: generic domain-tool engine; `src/tools/meta.ts`: coverage, query, login
- `src/client.ts`: the only network module (host allowlist, pacing, cache, retries); `src/auth.ts`: optional login
- `docs/recon/`: page-by-page site notes and the endpoint map these were built from
