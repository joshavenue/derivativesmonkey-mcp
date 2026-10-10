---
name: derivativesmonkey
description: Answer crypto options and derivatives questions (implied vol, skew, gamma exposure / GEX, gamma flip, call and put walls, max pain, open interest, options flow, block trades, funding, basis, IBIT options, strategy ideas, backtests) with the derivativesmonkey MCP server's dm_* tools, which read www.derivativesmonkey.com.
---

# Derivatives Monkey (crypto options analytics) via MCP

This skill assumes the `derivativesmonkey` MCP server is configured. Its tools are named `dm_*` (Claude Code: `mcp__derivativesmonkey__dm_*`). Derivatives Monkey (www.derivativesmonkey.com) aggregates options data from 12 crypto venues (Deribit, Derive, OKX, Bybit, Binance, Thalex, Paradex, Aevo, Delta, Bullish, Hypercall, Callput) plus IBIT and other US equity options via ThetaData.

## Rules

- **Read-only, Derivatives Monkey only.** Answer with what the tools return. Do not fill gaps with other sites or made-up numbers.
- **Cite.** Every result has `source` (the API call), usually `shownOn` (the site page) and `fetchedAtIso`. Say the figures come from Derivatives Monkey and give the time.
- **Say what was resolved.** If the result has `resolved` (default venue, next expiry), tell the user which venue/expiry the numbers are for.
- **Read `notes`.** They carry units, sign conventions and known data problems for that view.
- **Not advice.** Strategy picks, POP/EV and backtests are model outputs. Present them as such.

## How the tools work

Each domain tool takes `view` plus shared arguments:

- `asset`: default `btc`. Crypto: btc, eth, sol, hype, xrp, avax, zec, xaut, lit, pump, vvv. Equities/ETFs (ibit, spy, qqq, nvda, ...) via ThetaData. `dm_markets view assets` lists them all with venues.
- `source`: one venue. `sources`: several venues. Leave both out to get the site default: the asset's default venue where one venue is required, otherwise all venues merged.
- `expiry`: `YYYY-MM-DD` (or `30OCT26`). Default `next` = first expiry after today; `nearest` includes today's 0DTE. Unknown dates fail with the list of valid ones.
- `params`: view-specific params, listed in each tool description (`*` = required), e.g. `{strike: 85000, option_type: "C", window: "7d"}`.
- `fields`, `limit`, `offset`: keep results small. `limit`/`offset` page the main list and add `paging`.

Unsure which tool fits? `dm_coverage` with `topic` (e.g. `max pain`, `funding`, `whale`).

## Picking a tool

| Question | Tool, view |
| --- | --- |
| Which assets / venues / expiries exist | `dm_markets` assets, expiries |
| Spot, headline stats, call/put walls, put/call | `dm_markets` spot, market_summary |
| Option chain, one strike's detail | `dm_chain` chain (one venue), aggregate_chain (all), strike_insight |
| IV term structure, is IV rich/cheap | `dm_iv` term_structure, term_watermarks, percentile_search |
| Smile / surface | `dm_iv` smile, aggregate_smile, surface_history |
| Implied vs realized (VRP), vol cone | `dm_iv` vrp; `dm_realized_vol` vol_cone, weekly_variance |
| Expected move / range for an expiry | `dm_realized_vol` straddle_range, prob_cone, implied_prob |
| DVOL / vol index | `dm_realized_vol` dvol, mbvi |
| Skew, risk reversal, tail risk | `dm_skew` by_maturity, rr_history, tail_strike, wings |
| Gamma flip and gamma regime | `dm_gex` gamma_flip (cross-venue by default); with max pain: profile_live |
| Call wall / put wall, max pain | `dm_markets` market_summary; `dm_open_interest` by_strike (`max_pain`) |
| GEX by strike | `dm_gex` gex (one venue+expiry), aggregate_gex, profile (all expiries) |
| Dealer delta/vanna/charm | `dm_gex` dealer_positioning, dex_table, vanna, higher_greeks |
| What-if P&L for an option | `dm_gex` pnl_surface; scenario book P&L: greek_pnl |
| Open interest by strike/expiry, OI change | `dm_open_interest` by_strike (use `fields` or a single `source`), by_expiry, change |
| Put/call ratio history | `dm_open_interest` put_call_history |
| Recent trades, buyer vs seller flow | `dm_flow` tape, summary, net_premium |
| New positioning, 0DTE flow | `dm_flow` fresh_positioning, zero_dte |
| Biggest option movers | `dm_flow` movers |
| Block trades, whales | `dm_blocks` trades, whale_leaderboard, stats, net_delta_tape |
| Decode one block | `dm_blocks` trades, then trade_decode with `rfq_id` |
| Venue disagreement, arbitrage | `dm_divergence` iv, basis, freshness, arb |
| Futures basis / APR, funding | `dm_futures` basis, funding_current, funding_history |
| Perp order flow: CVD, footprint, liquidations | `dm_orderflow` cvd, footprint, liquidations |
| SVI / Heston / jump models | `dm_quant` svi, heston, merton_jump, rough_vol |
| Strategy ideas for a view | `dm_strategy` picks (one expiry), scan (cross-expiry); `bias` bullish, bearish, neutral, long_vol or short_vol |
| IBIT ETF options | `dm_ibit` |
| Backtest a position | `dm_backtest` meta (instrument names), then run with `body` |

## Signed-in features

Most data is public. Views tagged `[SIGNED-IN]` (dm_quant regime/direction/diagnostics/anomalies, dm_backtest v2_meta/v2_hedge) need a Derivatives Monkey account:

1. `dm_auth_status`. If not signed in, ask the user, then call `dm_login`.
2. `dm_login` opens a browser window. Tell the user to sign in there themselves. Never ask for or handle their password.
3. A 401 with hint "session expired" means calling `dm_login` again.

## Reading the numbers

- **IV** is in percent points on crypto views (45.2 = 45.2%); IBIT chain IV is a fraction (0.49).
- **Option prices** on Deribit/OKX BTC/ETH are in coin (0.0021 BTC); look for `*_usd` fields.
- **Skew sign** differs between site pages (Skew: call minus put; Tail Strike/docs: put minus call). State which you quote.
- **GEX** is a model (open interest × assumed dealer side), not observed dealer positions. Cross-venue and single-venue gamma flips differ; say which `sources` you used.
- **Positive dealer gamma** (spot above flip) tends to pin/mean-revert near the walls; **negative gamma** (below flip) tends to trend and move faster.
- **Funding** `funding_rate_8h` and `apr_pct` are percents. Funding > 0.03%/8h with basis > 10% APR = crowded longs; negative funding with falling basis = crowded shorts.
- **Block notional** is counted differently on different pages (all legs vs one leg). Quote the field you used.

## Workflows

- **Vol view**: dm_realized_vol mbvi → dm_iv term_structure + term_watermarks → dm_iv percentile_search / vrp → dm_skew by_maturity → dm_divergence freshness before comparing venues.
- **Positioning**: dm_gex gamma_flip (regime) + dm_markets market_summary (walls) → dm_gex gex for the nearest 1-3 expiries → dm_gex dealer_positioning (flow vs naive signing; levels in only one are weak) → dm_futures funding_current + basis (crowding).
- **Flow**: dm_blocks stats + trades (structure and side of the big prints) → dm_flow summary / net_premium → dm_open_interest change or dm_flow fresh_positioning (new vs closing) → dm_open_interest by_strike (walls, max pain).
- **Plan a trade**: form the view above → dm_strategy picks for the bias → dm_gex pnl_surface for the chosen option → dm_realized_vol straddle_range (break-even vs implied move) → dm_backtest run on a recent similar structure.

## Known site issues

- Paradigm Telegram feed (dm_blocks tg_* views) has no data after 19 Jul 2026.
- The IV-percentile screener has listed only expired expiries; check dates.
- Backtest data starts ~6 Jul 2026; `fill_mode: "bidask"` has returned HTTP 500.
- Empty GEX `items` means no data, not zero gamma.
- Not served: live WebSocket streams, the order book (404 upstream), account writes (layouts, positions, alerts).

## Errors

Failed calls return `{error, status, route, hint}`. `status: null` means the server rejected your arguments: fix them (the message lists valid values). 401 means sign-in is needed or expired (see above). A 404 or HTML-instead-of-JSON on a valid call usually means the site changed that undocumented route: tell the user which route failed instead of retrying.
