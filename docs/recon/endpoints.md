# Derivatives Monkey undocumented API catalog

Generated 2026-10-10 from the SPA bundle (`index-9GFywra5.js` + 291 lazy chunks) and live probes. Base URL `https://www.derivativesmonkey.com` (same API on `https://ex63.derivativesmonkey.com`, which also hosts the websockets). FastAPI backend; `/docs`, `/openapi.json`, `/redoc` are NOT exposed (SPA HTML / 404).

## Summary

- GET endpoints probed live: **165**  - working (HTTP 200): **157** (of which 10 return an empty array/object at test time), auth required (401 "Missing token"): **6**, other errors: **2** (orderbook 404 no data; site-notice 404 = no banner).
- POST: `/api/backtest/run` works without login (200); `/api/backtest/v2/hedge` needs a token (401). Websockets: 6 (spot verified live).
- Excluded (account/write; not called): `/api/user/*`, `/api/auth/sync`, `/api/positions*`, `/api/alerts`, `/api/poster/*`, `/api/feedback`.
- **All public market data works anonymously.** Only `/api/quant/*`, `/api/backtest/v2/*`, `/api/health/sources/history` and the user endpoints need an Auth0 JWT (`Authorization: Bearer ...`).
- No rate limiting seen at ~1 req/s over ~330 requests (no 429). Responses are plain JSON (no envelope); pagination exists only as `limit`/`offset` on a few endpoints (rfq/trades max limit 2000, strike-insight/events).

## Casing & conventions

**Assets.** `asset` is case-insensitive on all endpoints where both cases were tried (expiries, gex-profile, rfq/trades, vol-cone, rfq/stats, funding, orderflow: `btc`/`BTC`, `eth`/`ETH`, `hype`/`HYPE` all returned identical payloads). Default when omitted = BTC on almost everything, and the SPA only sends it when not btc. The SPA sends lowercase for most `/api/market/*` builders and `/api/orderflow/*`, uppercase for `/api/rfq/*`, `vol-cone`, `weekly-variance`, `flow-agg`, `premium-flow-matrix`, `dex-table`, `expiry-exposure`, `higher-greeks`, `vanna`, `skew/watermarks`, etc. Response echoes are inconsistent (`"asset":"BTC"` vs `"btc"`), so normalise client-side. Unknown crypto asset => 422 `Unknown asset 'zzz'. Valid: [avax, btc, eth, hype, lit, pump, sol, vvv, xaut, xrp, zec]`. `/api/market/sources-all` is the authoritative catalog (48 underlyings incl. equities/ETFs such as spy, qqq, ibit, nvda via `thetadata`, and coincall-only alts like doge, bnb, sui); non-crypto symbols work on the generic endpoints too (e.g. `expiries?source=thetadata&asset=spy` => 33 expiries) even though they are not in the 422 "Valid" list. Site routes use `/{asset}/{page}` with VALID_ASSETS = btc, eth, hype, sol, zec, avax, xrp, xaut, lit, vvv, pump.

**Sources/venues.** Always lowercase: `derive, deribit, binance, bybit, okx, thalex, paradex, aevo, delta, bullish, callput, hypercall` (+ `coincall`, `thetadata` backend-only). `DERIBIT` => 400 `unknown source ... expected one of [...]`. Singular `source=` = exactly one venue (required on chain/gex/iv-smile/etc.); plural `sources=` = comma list, omitted => ALL venues for the asset (merged; heavy). Per-asset venue lists and defaults (from sources-all):

| asset | venues | default |
|---|---|---|
| btc | derive, deribit, binance, bybit, okx, thalex, paradex, aevo, delta, bullish, hypercall, callput | deribit |
| eth | derive, deribit, binance, bybit, okx, thalex, paradex, aevo, delta, bullish, hypercall, callput | deribit |
| sol | derive, bybit, deribit, binance, paradex | deribit |
| hype | derive, paradex, aevo, deribit, bybit | derive |
| xrp | derive, bybit, deribit, binance | deribit |
| avax | deribit | deribit |
| zec | derive, paradex | derive |
| xaut | derive, bybit, delta, binance, okx | derive |
| lit | derive | derive |
| pump | derive | derive |
| vvv | derive | derive |
| equities/ETFs (spy, qqq, ibit, tsla, nvda, ...) | thetadata | thetadata |
| coincall-only (aave, ena, kas, ordi, sui, trump, wlfi) / bnb, doge | coincall (+binance/bybit) | coincall |

HYPE default is `derive` (the SPA hard-codes this); BTC/ETH/SOL/XRP/AVAX default `deribit`; XAUT/ZEC/LIT/PUMP/VVV default `derive`. `/api/market/spot` for xaut returns 5 venues, hype 5, btc 11.

**Expiries.** Input format is ISO `YYYY-MM-DD` taken from `/api/market/expiries?source=&asset=` (e.g. nearest 2026-10-11, 12 listed). Some responses/inputs use Deribit-style tokens: `straddle-range.expiry="11OCT26"`, rfq `strike-ladder.expiry`, backtest meta `expiry_str` (day NOT zero padded: `9OCT26`). Instrument names per venue: deribit `BTC-11OCT26-83000-C`; derive `BTC-20261011-100000-C`; paradex/bullish `BTC-USDC-20261011-76000-C`; `chain-history`/`scanner/chart` need the venue-native name. `/api/wings` enforces `^\d{4}-\d{2}-\d{2}$`. Expiry dates can include same-day (0DTE) rows.

**Option type.** `C`/`P` everywhere, EXCEPT `/api/market/pnl-surface` (`call`/`put`, `C` => 400) and IBIT `contract_type` (`call`/`put`).

**Timestamps.** `*_ms` / `ts_ms` / `since_ms` / `from_ms` / `to_ms` = epoch milliseconds (UTC). Orderflow + scanner-chart use `ts` (ms); orderflow bars also have `open_time` (seconds); `times` arrays in `oi-strike-heatmap` and IBIT `gex-map` are epoch SECONDS; `computed_at`/`generated_at`/`time_grid` are ISO-8601 UTC strings (`...Z` or `+00:00`).

**Units.** IV in percent points (30.2 = 30.2 %) on crypto endpoints; IBIT chain `implied_volatility` is a fraction (0.49). Coin-margined venues (deribit BTC/ETH, okx) quote option `mark_price`/`price` in underlying coin (0.0021 BTC); chain-latest adds `mark_usd`, scanner/chart adds `*_usd`. Funding `funding_rate_8h` and `apr_pct` are percent numbers (0.0056 = 0.0056 %/8h; annualized 6.15 = 6.15 %). IBIT GEX is labelled dollars per 1 % move in the UI; units of the crypto GEX fields are not documented in the bundle (treat as USD-denominated notional per 1 % spot move).

**Errors.** FastAPI: 422 `{"detail":[{"type","loc":["query","<param>"],"msg"}]}` for missing/invalid query params; business-rule errors use `{"detail":"<string>"}` with 400/404/422. 401 = `{"detail":"Missing token"}`. Many "enum" params are NOT validated (invalid value silently ignored with 200) - flagged per endpoint. Heavy endpoints can take 2-10 s cold; use client timeouts >= 60 s.

## Market / volatility (IV, term structure, skew, spot, quant models)

| Endpoint | Params (* required) | Verified (status, latency, size) | Returns / notes | Pages | Example (relative) |
|---|---|---|---|---|---|
| `/api/market/expiries` | `source`* (e.g. deribit), `asset` (def btc; e.g. btc) | 200, 247 ms, 189 B | List of listed expiry dates (ISO YYYY-MM-DD, ascending) for one venue+asset. **Note:** Unknown source -> 400 listing valid sources: aevo, binance, bullish, bybit, callput, coincall, delta, deribit, derive, hypercall, okx, paradex, thalex, thetadata. Source names must be lowercase. | dashboard, calculator, greeks, open-interest, divergence | `/api/market/expiries?source=deribit&asset=btc` |
| `/api/market/expiries-all` | `asset` (def btc; e.g. btc) | 200, 254 ms, 1.8 KB | Map venue -> list of expiry dates for the asset (all venues in one call; venues with no listing return []). | dashboard, gex-profile, heatmaps | `/api/market/expiries-all?asset=btc` |
| `/api/market/expiries-classified` | `asset` (e.g. BTC), `source` (e.g. deribit) | 200, 250 ms, 611 B | Expiries for a venue with classification: type (daily/weekly/monthly/quarterly...) and dte (int days). | greek-exposure | `/api/market/expiries-classified?asset=BTC&source=deribit` |
| `/api/market/term-structure` | `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc) | 200, 244 ms, 1.2 KB | ATM IV term structure: points[{expiry_date,dte_days,atm_iv,sources_count}] aggregated over selected venues. | term, dashboard | `/api/market/term-structure?sources=deribit&asset=btc` |
| `/api/market/term-structure/watermarks` | `asset` (def BTC; e.g. BTC), `source` (e.g. deribit), `lookback_days` (def 90; e.g. 90) | 200, 715 ms, 654 B | Historical min/p25/p50/p75/max bands of ATM IV by tenor (7,14,30,60,90 d) over lookback_days. | term | `/api/market/term-structure/watermarks?asset=BTC&source=deribit&lookback_days=90` |
| `/api/market/market-summary` | `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc) | 200, 318 ms, 937 B | One-shot KPI summary: spot, ATM IV 7d/30d, term spread, net gamma regime, total OI, P/C ratio, call/put walls, top expiry, RV/VRP, IV percentile, gamma flip. | stats, dashboard | `/api/market/market-summary?sources=deribit&asset=btc` |
| `/api/market/atm-vs-rv` | `lookback_days` (def 30; e.g. 30), `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc) | 200, 767 ms, 184.0 KB | ATM IV (7/14/30/60 d) vs realised vol time series: points[...] (hourly, ~30 d) for VRP charts. | iv-rv-vrp, term, iv-percentile, dashboard | `/api/market/atm-vs-rv?lookback_days=30&sources=deribit&asset=btc` |
| `/api/market/skew-by-maturity` | `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc) | 200, 327 ms, 986 B | 25-delta risk reversal (rr_25d) per expiry per venue. | skew | `/api/market/skew-by-maturity?sources=deribit&asset=btc` |
| `/api/market/skew-sparklines` | `lookback_days` (def 7; e.g. 7), `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc) | 200, 2283 ms, 2.48 MB | Per venue, per expiry, a history of rr_25d points over lookback_days. Can be enormous without sources filter (27 MB for all venues). **Note:** Always pass sources=; the unfiltered call is ~27 MB. | skew | `/api/market/skew-sparklines?lookback_days=7&sources=deribit&asset=btc` |
| `/api/market/skew/watermarks` | `asset` (def BTC; e.g. BTC), `source` (e.g. deribit), `lookback_days` (def 90; e.g. 90) | 200, 245 ms, 1.2 KB | Percentile bands (min/p25/p50/p75/max) of 25d risk reversal per tenor over lookback_days. | skew | `/api/market/skew/watermarks?asset=BTC&source=deribit&lookback_days=90` |
| `/api/market/iv-percentile/search` | `source` (e.g. deribit), `min_pct` (e.g. 80), `max_pct` (e.g. 100), `lookback_days` (e.g. 90), `asset` (def btc; e.g. btc) | 200, 525 ms, 1.9 KB | Search expiries by ATM-IV percentile rank: rows with iv_atm, iv_percentile, tenor_days, samples. Filter by min_pct/max_pct/lookback_days/source. | iv-percentile | `/api/market/iv-percentile/search?source=deribit&min_pct=80&max_pct=100&lookback_days=90&asset=btc` |
| `/api/market/rr-history` | `tenor` (def 14; e.g. 14), `lookback_days` (def 7; e.g. 7), `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc) | 200, 249 ms, 6.9 KB | Risk-reversal history at a constant tenor per venue: points[{ts_ms,<venue>:rr}] and current_rr per venue. | skew | `/api/market/rr-history?tenor=14&lookback_days=7&sources=deribit&asset=btc` |
| `/api/market/pc-ratio-history` | `tenor` (def 30; e.g. 30), `lookback_days` (def 7; e.g. 7), `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc) | 200, 418 ms, 8.9 KB | Put/call ratio history at a constant tenor per venue: points[{ts_ms,<venue>:pc}] and current_pc. | skew, open-interest | `/api/market/pc-ratio-history?tenor=30&lookback_days=7&sources=deribit&asset=btc` |
| `/api/market/iv-term-history` | `source` (e.g. deribit), `lookback_days` (def 14; e.g. 14), `asset` (def btc; e.g. btc) | 200, 622 ms, 40.9 KB | Constant-maturity ATM IV history for tenors [1,2,3,4,7,14,30,60,90] days: points[{ts_ms,'1':iv,'2':iv...}]. | term | `/api/market/iv-term-history?source=deribit&lookback_days=14&asset=btc` |
| `/api/market/iv-term-history/aggregate` | `sources` (def all venues for asset; e.g. deribit), `lookback_days` (e.g. 14), `asset` (def btc; e.g. btc) | 200, 640 ms, 40.9 KB | Same as iv-term-history but per_source array for several venues (sources csv) at once. | term | `/api/market/iv-term-history/aggregate?sources=deribit&lookback_days=14&asset=btc` |
| `/api/market/iv-surface-history` | `source`* (e.g. deribit), `asset` (def btc; e.g. btc), `hours` (def 24; e.g. 24), `buckets` (def 12; e.g. 12) | 200, 2041 ms, 1.18 MB | Time-bucketed IV surface snapshots (hours x buckets): k_grid of log-moneyness and snapshots[{ts_ms,underlying_price,rows[{expiry,strike,type,mark_iv,delta,OI}]}]. 1.2 MB. | surfaces, /ibit/surface | `/api/market/iv-surface-history?source=deribit&asset=btc&hours=24&buckets=12` |
| `/api/market/iv-smile` | `source`* (e.g. deribit), `expiry`* (e.g. 2026-10-11), `asset` (def btc; e.g. btc) | 200, 260 ms, 1.6 KB | IV smile (per-strike call/put IV rows) for one venue+expiry. | skew, expiry, dashboard, expiry/:date | `/api/market/iv-smile?source=deribit&expiry=2026-10-11&asset=btc` |
| `/api/market/iv-boxplot` | `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc) | 200, 338 ms, 990 B | Distribution (p5/p25/median/p75/p95 + current) of ATM IV by tenor bucket. | iv-percentile, term | `/api/market/iv-boxplot?sources=deribit&asset=btc` |
| `/api/market/iv-crush-scan` | `asset` (def BTC; e.g. BTC), `lookback_days` (def 7; e.g. 7), `threshold_pct` (def 10; e.g. 10) | 200, 427 ms, 23.3 KB | Scan for IV-crush events: events[{expiry_date,source,tenor_days,iv_peak,iv_current,crush_pct,dte}] where crush >= threshold_pct within lookback_days. | iv-percentile | `/api/market/iv-crush-scan?asset=BTC&lookback_days=7&threshold_pct=10` |
| `/api/market/aggregate/chain` | `expiry`* (e.g. 2026-10-11), `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc) | 200, 427 ms, 23.4 KB | Cross-venue chain: rows[{strike,by_source:{venue:{call,put}}}] for one expiry. | dashboard, skew | `/api/market/aggregate/chain?expiry=2026-10-11&sources=deribit&asset=btc` |
| `/api/market/aggregate/gex` | `expiry`* (e.g. 2026-10-11), `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc) | 200, 254 ms, 3.7 KB | Cross-venue GEX per strike: rows[{strike,by_source:{venue:...}}]. | dashboard, expiry | `/api/market/aggregate/gex?expiry=2026-10-11&sources=deribit&asset=btc` |
| `/api/market/aggregate/iv-smile` | `expiry`* (e.g. 2026-10-11), `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc) | 200, 259 ms, 2.4 KB | Cross-venue IV smile per strike for one expiry. | skew, expiry | `/api/market/aggregate/iv-smile?expiry=2026-10-11&sources=deribit&asset=btc` |
| `/api/market/divergence/iv` | `expiry`* (e.g. 2026-10-11), `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc) | 200, 631 ms, 48.8 KB | Cross-venue IV divergence per strike: call_spread/put_spread plus which venue is max/min. | divergence | `/api/market/divergence/iv?expiry=2026-10-11&asset=btc` |
| `/api/market/divergence/basis` | `expiry`* (e.g. 2026-10-11), `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc) | 200, 867 ms, 51.1 KB | Cross-venue divergence of option basis/price per strike (same shape as divergence/iv). | divergence, basis | `/api/market/divergence/basis?expiry=2026-10-11&asset=btc` |
| `/api/market/divergence/freshness` | `expiry`* (e.g. 2026-10-11), `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc) | 200, 349 ms, 1.9 KB | Data freshness per venue: freshest_source/freshest_ts_ms and per_source staleness. | divergence | `/api/market/divergence/freshness?expiry=2026-10-11&asset=btc` |
| `/api/market/divergence/gamma` | `expiry`* (e.g. 2026-10-11), `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc) | 200, 616 ms, 54.2 KB | Cross-venue gamma divergence per strike (call_spread_pct/put_spread_pct). | divergence | `/api/market/divergence/gamma?expiry=2026-10-11&asset=btc` |
| `/api/market/divergence/arb` | `limit` (def 50; e.g. 5), `asset` (def btc; e.g. btc) | 200, 358 ms, 1.1 KB | Top IV-arbitrage candidates between venues: buy_source, sell_source, iv_spread_vp, fee_cost_vp, net_edge_vp, expiry_date. | arb-guide, divergence | `/api/market/divergence/arb?limit=5&asset=btc` |
| `/api/market/straddle-range` | `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc), `expiry` | 200, 404 ms, 197 B | ATM straddle for the nearest (or given) expiry: premium, % of spot, breakevens (be_low/be_high). Note expiry string is Deribit-style (11OCT26). | builder/straddle, dashboard | `/api/market/straddle-range?sources=deribit&asset=btc` |
| `/api/market/tail-strike` | `asset` (def btc; e.g. btc), `source` (e.g. deribit) | 200, 449 ms, 355 B | Tail-risk score from far-OTM skew: tail_strike_score, put/call IV at 10d/25d delta, signal, flash_crash_risk, confidence. | tail-strike | `/api/market/tail-strike?asset=btc&source=deribit` |
| `/api/market/tail-strike-history` | `asset` (def btc; e.g. btc), `source` (e.g. deribit), `window_days` (e.g. 30) | 200, 761 ms, 128.6 KB | History (ms timestamps) of the tail strike score and skew components; window_days param. | tail-strike | `/api/market/tail-strike-history?asset=btc&source=deribit&window_days=30` |
| `/api/market/vol-cone` | `asset` (def BTC; e.g. BTC) | 200, 315 ms, 1011 B | Realised-vol cone: per window (7/14/30/60/90 d) hv_current, hv percentiles, iv_atm, iv_premium, iv_pct_rank. | iv-rv-vrp | `/api/market/vol-cone?asset=BTC` |
| `/api/market/weekly-variance` | `asset` (def BTC; e.g. BTC), `weeks` (def 12; e.g. 12) | 200, 283 ms, 2.1 KB | Weekly realised variance/vol and return for the last N weeks (implied_var/vrp may be null). | iv-rv-vrp | `/api/market/weekly-variance?asset=BTC&weeks=12` |
| `/api/market/prob-cone` | `asset` (e.g. btc) | 200, 251 ms, 1.1 KB | Probability cone from ATM IV: horizons[{tenor_days,iv_atm,lower/upper 1sigma/2sigma price}]. | quant, term | `/api/market/prob-cone?asset=BTC` |
| `/api/market/implied-prob` | `asset` (e.g. btc), `expiry`* (e.g. 2026-10-11) | 200, 262 ms, 6.0 KB | Risk-neutral implied probabilities per strike for one expiry (prob_call_itm, prob_put_itm ...). | greeks | `/api/market/implied-prob?asset=BTC&expiry=2026-10-11` |
| `/api/market/ivr-gamma-flip` | `asset` (e.g. btc) | 200, 348 ms, 280 B | IV rank (30 d) + current IV + gamma flip level in one tiny payload. | stats | `/api/market/ivr-gamma-flip?asset=BTC` |
| `/api/market/vol-lifecycle` | `asset` (e.g. btc) | 200, 304 ms, 507 B | Vol regime/lifecycle phase classifier (e.g. CONSOLIDATION): phase, confidence, ivp, iv_atm, velocities, skew, term slope, data_quality. | stats | `/api/market/vol-lifecycle?asset=btc` |
| `/api/market/svi-surface` | `asset` (e.g. btc), `expiry`* (e.g. 2026-10-11) | 200, 437 ms, 4.1 KB | SVI fit for one expiry: svi_a/b/rho/m/sigma, fit_error and points[{log_moneyness,strike,market_iv,svi_iv}]. | quant | `/api/market/svi-surface?asset=BTC&expiry=2026-10-11` |
| `/api/market/svi-full-surface` | `source`* (e.g. deribit), `asset` (def btc; e.g. btc) | 200, 1178 ms, 8.1 KB | SVI-fitted IV rows on a common log-moneyness grid for all expiries of a venue (iv_row[80] per expiry). | surfaces, quant | `/api/market/svi-full-surface?source=deribit&asset=btc` |
| `/api/market/merton-jump` | `asset` (e.g. btc), `lambda_` (def 3; e.g. 3), `mu_j` (def -0.05; e.g. -0.05), `sigma_j` (def 0.08; e.g. 0.08) | 200, 248 ms, 2.0 KB | Merton jump-diffusion model option prices vs strike_pct for given lambda_/mu_j/sigma_j (model playground, synthetic). | quant | `/api/market/merton-jump?asset=BTC&lambda_=3&mu_j=-0.05&sigma_j=0.08` |
| `/api/market/rough-vol` | `asset` (e.g. btc) | 200, 246 ms, 377 B | Rough-volatility diagnostics: Hurst exponent, interpretation, sigma_0, per-tenor values. | quant | `/api/market/rough-vol?asset=BTC` |
| `/api/market/heston-surface` | `asset` (e.g. btc), `v0` (def 0.15; e.g. 0.15), `theta` (def 0.15; e.g. 0.15), `kappa` (def 2; e.g. 2), `xi` (def 0.5; e.g. 0.5), `rho` (def -0.7; e.g. -0.7) | 200, 243 ms, 2.0 KB | Heston model prices/IVs vs strike_pct for given v0/theta/kappa/xi/rho (model playground; spot is a fixed 100000 reference). | quant | `/api/market/heston-surface?asset=BTC&v0=0.15&theta=0.15&kappa=2&xi=0.5&rho=-0.7` |
| `/api/market/dvol-index` | `asset` (def btc; e.g. btc), `days` (e.g. 30) | 200, 339 ms, 6.4 KB | Deribit DVOL-style volatility index: current, 24h change, regime and 7 d history (hourly). | vol-index, ibit/cross | `/api/market/dvol-index?asset=btc` |
| `/api/market/mbvi-index` | `asset` (def btc; e.g. btc) | 200, 294 ms, 7.7 KB | MBVI (multi-venue blended vol index): current, 24h change, near/next expiry, per-venue values. | vol-index | `/api/market/mbvi-index?asset=btc` |
| `/api/market/mbvi-candles` | `asset` (def btc; e.g. btc), `resolution` (1m\|3m\|5m\|15m\|30m\|1H\|2H\|4H\|1D\|1W\|1M; def 1D), `source` (combined\|computed\|deribit\|derive\|bybit\|binance\|thalex\|okx; def combined), `from_ms`, `to_ms` | 200, 282 ms, 9.3 KB | OHLC candles of the MBVI index (resolution 1m..1M) with optional from_ms/to_ms. **Note:** Unknown source returns 200 with candles:[] (slow, 12.8 s); only the listed venues have data. | vol-index | `/api/market/mbvi-candles?asset=btc&resolution=1D` |
| `/api/market/spot` | `asset` (def btc; e.g. btc) | 200, 289 ms, 1.1 KB | Latest spot/index price per venue: [{source,price,ts_ms,recv_ts_ms,age_ms}]. REST twin of the /api/ws/spot snapshot. | arb-guide | `/api/market/spot?asset=btc` |
| `/api/market/spot-history` | `window_minutes` (def 60; e.g. 60), `interval_minutes` (def 1; e.g. 5), `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc) | 200, 319 ms, 777 B | Venue spot price series at interval_minutes over window_minutes: points[{ts_ms,prices:{venue:price}}]. | spot, basis, calculator, payoff | `/api/market/spot-history?window_minutes=60&interval_minutes=5&sources=deribit&asset=btc` |
| `/api/market/spot-candles` | `asset` (e.g. BTC), `tf` (1m\|3m\|5m\|15m\|30m\|1H\|2H\|4H\|6H\|12H\|1D\|1W\|1M; def 1D), `source` (bybit\|binance\|coinbase\|kraken (SPA uses bybit; unknown values silently accepted); def bybit), `limit` (def 730; e.g. 100), `full` | 200, 440 ms, 11.6 KB | Spot OHLCV candles from an exchange feed (default bybit): candles[{ts_ms,open,high,low,close,volume,...}]. full=1 returns max history. **Note:** Valid tf: 1m,3m,5m,15m,30m,1H,2H,4H,6H,12H,1D,1W,1M (case-sensitive, 'm' minutes vs 'M' month). Unknown source silently falls back (200). | spot, gex-profile, block-rfq/* | `/api/market/spot-candles?asset=BTC&tf=1D&source=bybit&limit=100` |
| `/api/market/time-at-price-kline` | `asset` (e.g. BTC), `tf` (1m\|3m\|5m\|15m\|30m\|1H\|2H\|4H\|6H\|12H\|1D\|1W\|1M; def 1H), `limit` (def 168; e.g. 48), `price_bins` (def 80; e.g. 40) | 200, 525 ms, 9.5 KB | Time-at-price (market profile) heatmap: cells[{ti,pi,count}] over time bins x price bins, plus spot_path. **Note:** tf valid values same as spot-candles. | spot | `/api/market/time-at-price-kline?asset=BTC&tf=1H&limit=48&price_bins=40` |
| `/api/market/lead-lag` | `limit` (e.g. 50), `asset` (def btc; e.g. btc) | 200, 264 ms, 9.8 KB | Latest cross-venue lead/lag correlations: [{source_a,source_b,lag_seconds,correlation,samples}]. | lead-lag | `/api/market/lead-lag?limit=50&asset=btc` |
| `/api/market/lead-lag/config` | `asset` (def btc; e.g. btc) | 200, 330 ms, 77 B | Parameters of the lead-lag job: lags [1,5,15] s, window_seconds, interval_seconds, min_samples. | lead-lag | `/api/market/lead-lag/config?asset=btc` |
| `/api/market/lead-lag/history` | `source_a` (e.g. deribit), `source_b` (e.g. bybit), `lag_seconds` (e.g. 1), `hours` (def 1; e.g. 1), `limit` (def 1000; e.g. 100), `asset` (def btc; e.g. btc) | 200, 285 ms, 7.4 KB | Historical lead-lag correlation rows for a venue pair/lag. | lead-lag | `/api/market/lead-lag/history?source_a=deribit&source_b=bybit&lag_seconds=1&hours=1&limit=100&asset=btc` |
| `/api/market/orderbook` | `source` (e.g. deribit), `instrument`* (e.g. BTC-11OCT26-83000-C), `asset` (def btc; e.g. btc), `depth` (e.g. 10) | 404, 395 ms, 58 B | L2 order-book ladder for one option contract. SPA pins source=bullish (only venue with captured depth). All calls tested returned 404 'no order book for ...' (empty pipeline at test time). **Note:** 404 {'detail':"no order book for '<instrument>'"} for every deribit/derive/paradex/bullish instrument tried: unusable at test time. | dashboard | `/api/market/orderbook?source=bullish&instrument=BTC-USDC-20270625-72000-C&asset=btc&depth=5` |
| `/api/market/orderbook/instruments` | `source` (e.g. deribit), `asset` (def btc; e.g. btc) | 200, 792 ms, 91.1 KB | Instrument list available for the order-book page. Ignores the source param: always returned the Bullish list (BTC-USDC-YYYYMMDD-STRIKE-C/P, ~1,400 rows). **Note:** source param ignored; list is Bullish USDC-quoted names. | dashboard | `/api/market/orderbook/instruments?source=deribit&asset=btc` |
| `/api/wings` | `source` (e.g. deribit), `expiry`* (e.g. 2026-10-11), `asset` (def btc; e.g. btc) | 200, 280 ms, 502 B | Wing richness: IV, strike, OI(USD) and rank_pct at 10d/35d put and call wings for one venue+expiry. **Note:** expiry must match ^\d{4}-\d{2}-\d{2}$ (422 otherwise). | skew | `/api/wings?source=deribit&expiry=2026-10-11&asset=btc` |
| `/api/wings/expiries` | `source` (e.g. deribit), `asset` (def btc; e.g. btc) | 200, 303 ms, 170 B | List of expiry dates (YYYY-MM-DD) that have wing data for the venue. | skew | `/api/wings/expiries?source=deribit&asset=btc` |
| `/api/quant/regime` | `asset` (def btc; e.g. btc) | 401, 252 ms, 26 B | Vol regime classification model output (Markov regime). Requires Auth0 bearer token (401 Missing token). **Note:** 401 {'detail':'Missing token'} without Authorization: Bearer <Auth0 JWT>. | vol-regime, quant | `/api/quant/regime?asset=btc` |
| `/api/quant/direction` | `asset` (def btc; e.g. btc) | 401, 240 ms, 26 B | Direction signal model output. Requires bearer token. **Note:** 401 without bearer token. | vol-regime, quant | `/api/quant/direction?asset=btc` |
| `/api/quant/diagnostics` | `asset` (def btc; e.g. btc) | 401, 280 ms, 26 B | Model diagnostics. Requires bearer token. **Note:** 401 without bearer token. | vol-regime, quant | `/api/quant/diagnostics?asset=btc` |
| `/api/quant/anomaly/recent` | `limit` (def 20; e.g. 20), `asset` (def btc; e.g. btc) | 401, 327 ms, 26 B | Recent tape anomaly detections. Requires bearer token. **Note:** 401 without bearer token. | vol-regime, quant | `/api/quant/anomaly/recent?limit=20&asset=btc` |

## Greeks, GEX and open interest

| Endpoint | Params (* required) | Verified (status, latency, size) | Returns / notes | Pages | Example (relative) |
|---|---|---|---|---|---|
| `/api/market/chain` | `source`* (e.g. deribit), `expiry`* (e.g. 2026-10-11), `asset` (def btc; e.g. btc) | 200, 571 ms, 23.3 KB | Option chain for one venue+expiry, one row per strike with nested call/put objects (19 fields each: mark/bid/ask, IV, greeks, OI, volume, 24h change...). Prices for coin-margined venues (deribit btc/eth, okx) are in coin units; see mark_usd in chain-latest. | dashboard, expiry, calculator, strategy | `/api/market/chain?source=deribit&expiry=2026-10-11&asset=btc` |
| `/api/market/chain-latest` | `source`* (e.g. deribit), `asset` (def btc; e.g. btc) | 200, 1105 ms, 302.4 KB | Full latest snapshot of every listed option instrument for a venue (flat rows: mark_price, mark_iv, bid_iv/ask_iv, delta/gamma/theta/vega, open_interest, underlying_price, mark_usd). ~300 KB for BTC/deribit. | dashboard, scanner, builder/*, ibit/surface, ibit/vol | `/api/market/chain-latest?source=deribit&asset=btc` |
| `/api/market/chain-history` | `instrument`* (e.g. BTC-11OCT26-83000-C), `source` (e.g. deribit), `hours` (def 24; e.g. 24) | 200, 486 ms, 2.7 KB | Time series (default last 24 h) of mark price / mark IV / underlying for a single instrument name. | scanner, builder/*, instrument | `/api/market/chain-history?instrument=BTC-11OCT26-83000-C&source=deribit&hours=24` |
| `/api/market/gex` | `source`* (e.g. deribit), `expiry`* (e.g. 2026-10-11), `asset` (def btc; e.g. btc), `view` (standard\|corrected; def standard) | 200, 272 ms, 6.4 KB | Per-strike gamma exposure for one venue+expiry: call_gex, put_gex, net_gex (+ 'corrected' variants when view=corrected and taker-flow imbalance fields). **Note:** view must be 'standard' or 'corrected' (400/422 otherwise). | gex, gex-profile, dashboard | `/api/market/gex?source=deribit&expiry=2026-10-11&asset=btc` |
| `/api/market/gex-profile` | `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc), `view` (standard\|corrected; def standard) | 200, 584 ms, 15.1 KB | Strike-by-strike OI-based gamma exposure profile aggregated across expiries (and venues if several): items[{strike,source,call_gex,put_gex,net_gex,...}] plus spot. | gex-profile, levels, dashboard | `/api/market/gex-profile?sources=deribit&asset=btc` |
| `/api/market/gex-profile-live` | `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc), `expiry` (e.g. 2026-10-11) | 200, 440 ms, 27.2 KB | Live bundle used by the chart overlay: oi_profile (per-strike OI + max_pain + P/C summary) and gamma_flip (flip strike + GEX profile) in one response. | chart overlays (gex-levels indicator) | `/api/market/gex-profile-live?sources=deribit&asset=btc` |
| `/api/market/gex-strike-heatmap` | `expiry` (e.g. 2026-10-11), `sources` (def all venues for asset; e.g. deribit), `window_hours` (e.g. 24), `price_band` (e.g. 0.1), `view` (standard\|corrected; def standard), `asset` (def btc; e.g. btc) | 200, 4773 ms, 81.7 KB | Time x strike GEX heatmap: time_grid (ISO), strike_grid, gex matrix [time][strike], spot_now, window_hours (default 24) and price_band (+/- fraction of spot). | gex-profile, heatmaps | `/api/market/gex-strike-heatmap?sources=deribit&asset=btc&window_hours=24` |
| `/api/market/gamma-flip` | `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc), `view` (standard\|corrected; def standard) | 200, 250 ms, 6.1 KB | Gamma flip level: flip_strike, distance to spot (usd/pct), regime (long_gamma/short_gamma) and the net GEX profile by strike. | levels, gex-profile, dashboard | `/api/market/gamma-flip?sources=deribit&asset=btc` |
| `/api/market/greek-exposure-projection` | `asset` (e.g. BTC), `source` (e.g. deribit), `expiry_filter` (e.g. 2026-10-11), `bucket`, `agg` (single\|cumulative; def single) | 200, 3690 ms, 1.44 MB | Large projection grids of dealer gamma/charm/vanna exposure over a spot grid (s_grid) x future time (timestamps): gamma_matrix, charm_matrix, vanna_matrix + gamma_flip/charm_neutral/vanna_neutral prices. 1.5-1.9 MB, 2-5 s. **Note:** bucket and agg are NOT validated (invalid values return 200 with default). Frontend uses expiry_filter+agg single\|cumulative. | greek-exposure | `/api/market/greek-exposure-projection?asset=BTC&source=deribit&expiry_filter=2026-10-11&agg=single` |
| `/api/market/thermography` | `asset` (def btc; e.g. btc), `source` (e.g. deribit), `greek` (gamma_exposure\|vanna_exposure\|charm_exposure\|vega_exposure) | 200, 2310 ms, 65.8 KB | Strike x expiry heat grid of one greek exposure (cells[{strike,expiry_date,call_value,put_value,net_value}]) for the chosen greek. | thermography | `/api/market/thermography?asset=btc&source=deribit` |
| `/api/market/oi-strike-heatmap` | `asset` (e.g. BTC), `sources` (def all venues for asset; e.g. deribit), `bucket` (def auto; e.g. auto) | 200, 2715 ms, 478.5 KB | Open-interest history heatmap: times (epoch s), s_grid (strikes), matrix[strike][time], spot_history OHLC, bucket (auto: 4h for ~97 d). ~490 KB, 2.7 s warm but timed out at 30 s on a cold first call with default sources. **Note:** Cold first call with default sources timed out at 30 s; subsequent sources=deribit call took ~2.7 s. Use a client timeout >= 60 s. | open-interest, heatmaps | `/api/market/oi-strike-heatmap?asset=BTC&sources=deribit` |
| `/api/market/oi-profile` | `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc), `expiry` (e.g. 2026-10-11) | 200, 438 ms, 20.2 KB | Open interest per strike (calls_oi/puts_oi, market value and intrinsic USD) for the selected venues/expiry, plus spot, max_pain and summary. | open-interest, levels | `/api/market/oi-profile?sources=deribit&asset=btc` |
| `/api/market/oi-profile-live` | `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc), `expiry` (e.g. 2026-10-11) | 200, 633 ms, 20.2 KB | Same shape as oi-profile but computed from the live (less cached) snapshot; the SPA polls it every ~5 s. | open-interest, oi-profile | `/api/market/oi-profile-live?sources=deribit&asset=btc` |
| `/api/market/oi-by-expiry` | `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc) | 200, 710 ms, 1.5 KB | Open interest (calls/puts/total) per expiry, per venue. | open-interest | `/api/market/oi-by-expiry?sources=deribit&asset=btc` |
| `/api/market/oi-by-type` | `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc) | 200, 488 ms, 142 B | Total call OI, put OI and put/call ratio per venue. | open-interest | `/api/market/oi-by-type?sources=deribit&asset=btc` |
| `/api/market/oi-change` | `lookback_hours` (def 24; e.g. 24), `sources` (def all venues for asset; e.g. deribit), `asset` (def btc; e.g. btc), `breakdown` (total\|calls_puts; def total) | 200, 262 ms, 994 B | OI change over lookback_hours per venue: total_oi, oi_24h_ago, delta_oi/pct, by_expiry and by_expiry_change maps (calls/puts split with breakdown=calls_puts). | open-interest | `/api/market/oi-change?lookback_hours=24&sources=deribit&asset=btc` |
| `/api/market/dealer-positioning` | `asset` (def btc; e.g. btc), `sources` (def all venues for asset; e.g. deribit), `expiry` (def all; e.g. all), `signing` (flow\|naive?(unverified, not validated server-side); def flow), `window_hours` (e.g. 24) | 200, 1218 ms, 17.7 KB | Dealer GEX/VEX/DEX by strike and by expiry using trade-flow signing (flow) or naive signing; includes flow_coverage stats. **Note:** signing not validated (invalid value 200). | levels, dashboard | `/api/market/dealer-positioning?asset=btc&sources=deribit&signing=flow` |
| `/api/market/higher-greeks` | `asset` (def BTC; e.g. BTC), `expiry` | 200, 337 ms, 12.7 KB | Higher-order greek exposure per strike (speed, zomma, color) summed over OI for all expiries or one. **Note:** asset is uppercased by the SPA; lowercase also works. | greek-exposure/higher-greeks | `/api/market/higher-greeks?asset=BTC` |
| `/api/market/vanna` | `asset` (def BTC; e.g. BTC), `expiry` (def all; e.g. all) | 200, 413 ms, 13.7 KB | Vanna exposure per strike (vanna_call, vanna_put, net_vanna). | greek-exposure/higher-greeks, greeks | `/api/market/vanna?asset=BTC&expiry=all` |
| `/api/market/dex-table` | `asset` (def BTC; e.g. BTC), `sources` (def all venues for asset; e.g. deribit) | 200, 348 ms, 1.9 KB | Delta/dealer exposure table per expiry: call_dex, put_dex, net_dex ... | greeks | `/api/market/dex-table?asset=BTC&sources=deribit` |
| `/api/market/expiry-exposure` | `asset` (def BTC; e.g. BTC), `source` (def deribit; e.g. deribit) | 200, 337 ms, 4.0 KB | Per-expiry call/put GEX, DEX, VEX (nested call/put objects) and net_gex/net_dex/net_vex. | greeks | `/api/market/expiry-exposure?asset=BTC&source=deribit` |
| `/api/market/greek-pnl` | `asset` (e.g. BTC), `ds` (e.g. 0.0), `dvol` (e.g. 0.0), `dt` (e.g. 1.0) | 200, 244 ms, 521 B | Greek P&L attribution of the current book for a scenario (ds spot shock, dvol vol shock, dt days): components[delta,gamma,vega,theta] and total_pnl. | greeks | `/api/market/greek-pnl?asset=BTC&ds=0&dvol=0&dt=1` |
| `/api/market/pnl-surface` | `asset` (e.g. BTC), `strike`* (e.g. 83000), `option_type`* (C\|P), `expiry`* (e.g. 2026-10-11), `contracts` (def 1; e.g. 1) | 200, 265 ms, 3.8 KB | Option P&L surface (spot x time) for a single option position: entry price, sigma, and points[{...3 keys}]. **Note:** option_type must be the words 'call' or 'put' (NOT 'C'/'P' as other endpoints use); 'C' returns 400. | calculator, builder/option-pnl | `/api/market/pnl-surface?asset=BTC&strike=83000&option_type=call&expiry=2026-10-11&contracts=1` |

## Flow, RFQ / block trades

| Endpoint | Params (* required) | Verified (status, latency, size) | Returns / notes | Pages | Example (relative) |
|---|---|---|---|---|---|
| `/api/market/trades/aggregate` | `sources` (def all venues for asset; e.g. deribit), `since_ms` (e.g. 1791626125417), `limit` (e.g. 100), `spread`, `asset` (def btc; e.g. btc) | 200, 433 ms, 17.4 KB | Recent option trades across venues: provenance + rows[{source,instrument,strike,option_type,ts_ms,price(coin),amount,direction,iv,underlying_price}]. spread=true groups multi-leg prints. | tape, dashboard, order-flow | `/api/market/trades/aggregate?sources=deribit&since_ms=1791626125417&limit=100&asset=btc` |
| `/api/market/flow-map-bins` | `sources` (def all venues for asset; e.g. deribit), `since_ms` (e.g. 1791543325417), `bucket_ms` (e.g. 3600000), `price_bucket_width`, `sparse_threshold`, `expiries`, `asset` (def btc; e.g. btc) | 200, 1343 ms, 328.5 KB | Trade-flow bubble-map data: bins[{t_bucket_ms,price_bucket,option_type,direction,count,total_notional}] + sparse_trades. Up to 4 MB on wide windows. | order-flow, tape | `/api/market/flow-map-bins?sources=deribit&since_ms=1791543325417&bucket_ms=3600000&asset=btc` |
| `/api/market/flow-summary` | `sources` (def all venues for asset; e.g. deribit), `since_ms` (e.g. 1791543325417), `asset` (def btc; e.g. btc) | 200, 265 ms, 8.9 KB | Aggregated option flow since since_ms by expiry/type/direction: count, total_amount, total_premium, total_notional. | dashboard, volume-flow | `/api/market/flow-summary?sources=deribit&since_ms=1791543325417&asset=btc` |
| `/api/market/volume-by-strike` | `sources` (def all venues for asset; e.g. deribit), `since_ms` (e.g. 1791543325417), `asset` (def btc; e.g. btc) | 200, 597 ms, 31.3 KB | Traded volume cells by expiry x strike since since_ms. | volume-flow, open-interest | `/api/market/volume-by-strike?sources=deribit&since_ms=1791543325417&asset=btc` |
| `/api/market/fresh-positioning-by-strike` | `sources` (def all venues for asset; e.g. deribit), `since_ms` (e.g. 1791543325417), `asset` (def btc; e.g. btc) | 200, 601 ms, 8.9 KB | Per-strike 24h volume vs open interest (fresh positioning ratio). | volume-flow | `/api/market/fresh-positioning-by-strike?sources=deribit&since_ms=1791543325417&asset=btc` |
| `/api/market/flow-agg` | `asset` (def BTC; e.g. BTC), `window_h` (def 24; e.g. 24), `sources` (def all venues for asset; e.g. deribit) | 200, 1512 ms, 225.5 KB | Aggregated flow for a trailing window_h: summary (call/put premium, net flow, buys vs sells) + top_trades + breakdowns. 230 KB-500 KB. | order-flow, stats, /ibit/flow | `/api/market/flow-agg?asset=BTC&window_h=24&sources=deribit` |
| `/api/market/premium-flow-matrix` | `asset` (def BTC; e.g. BTC), `window_h` (def 24; e.g. 24), `sources` (def all venues for asset; e.g. deribit) | 200, 841 ms, 75.1 KB | Premium flow matrix cells by venue x strike x expiry x type with buy/sell premium USD. | premium | `/api/market/premium-flow-matrix?asset=BTC&window_h=24&sources=deribit` |
| `/api/market/zdte-distribution` | `asset` (e.g. BTC), `dte_max` (def 3; e.g. 3), `sources` (def all venues for asset; e.g. deribit) | 200, 427 ms, 15.9 KB | 0-3 DTE OI/volume/IV distribution by strike (by_dte summary + strikes[]). | open-interest | `/api/market/zdte-distribution?asset=BTC&dte_max=3&sources=deribit` |
| `/api/volume-flow/net-premium` | `asset` (def BTC; e.g. BTC), `scope` (screen\|block\|both; def both), `window_h` (def 24; e.g. 24), `sources` (def all venues for asset; e.g. deribit) | 200, 1204 ms, 698 B | Net premium by option_type x direction over window_h, scope screen\|block\|both; includes net_call/put/total premium USD. | volume-flow | `/api/volume-flow/net-premium?asset=BTC&scope=both&window_h=24` |
| `/api/rfq/trades` | `asset` (def BTC; e.g. BTC), `limit` (def 100; e.g. 20), `source` (paradigm_drfq\|paradigm_ob\|deribit\|derive\|okx (observed in data; unvalidated)), `status` (FILLED\|OPEN\|CANCELED\|EXPIRED (inferred from /api/rfq/stats counters; unvalidated)), `since_ms`, `offset` (def 0; e.g. 0) | 200, 597 ms, 16.3 KB | Block/RFQ trade ledger (Paradigm, Deribit blocks, Derive, ...) newest first: rfq_id, source, status, legs[], notional_usd, strategy_code/display, spot_at_trade ... Supports offset+limit paging (frontend pages with limit/offset). **Note:** status/source are free strings (unknown value returns [] not 422). Observed sources: paradigm_drfq, ... ; status FILLED common. limit max 2000 (422 above); offset paging works. status/source are free strings (unknown value => [] not 422). Sources observed in data: paradigm_drfq, okx, deribit, derive, paradigm_ob. Default (no status) returned only FILLED rows. Asset accepted in either case. | blocks, paradigm-flow, block-rfq/* | `/api/rfq/trades?asset=BTC&limit=20&status=FILLED` |
| `/api/rfq/stats` | `asset` (def BTC; e.g. BTC), `hours` (e.g. 24), `source` (e.g. deribit) | 200, 345 ms, 328 B | Block flow totals (counts by status; notional buy/sell/call/put/bullish/bearish USD) for an asset over the last N hours. | blocks, paradigm-flow, block-rfq/* | `/api/rfq/stats?asset=BTC&hours=24` |
| `/api/rfq/strategy-popularity` | `asset` (def BTC; e.g. BTC), `source` (e.g. deribit), `hours` (e.g. 24) | 200, 339 ms, 2.1 KB | Strategy mix buckets [{strategy,count,notional_usd,premium_usd,pct}] over the last N hours. | blocks, block-rfq/* | `/api/rfq/strategy-popularity?asset=BTC&hours=24` |
| `/api/rfq/settlement-price` | `asset` (e.g. BTC), `expiry_date`* (e.g. 2026-10-09) | 200, 346 ms, 89 B | Settlement price of an expired expiry (asset, expiry_date YYYY-MM-DD); used to PnL block trades. | block-rfq/* | `/api/rfq/settlement-price?asset=BTC&expiry_date=2026-10-09` |
| `/api/rfq/insights/whale-leaderboard` | `asset` (def BTC; e.g. BTC), `hours` (def 24; e.g. 24), `limit` (def 20; e.g. 20) | 200, 592 ms, 14.6 KB | Largest block trades in the window ranked by notional (trades[] with net_delta, direction_label, legs). | block-rfq/paradigm | `/api/rfq/insights/whale-leaderboard?asset=BTC&hours=24&limit=20` |
| `/api/rfq/insights/strategy-rotation` | `asset` (def BTC; e.g. BTC), `days` (def 30; e.g. 30), `bucket_hours` (def 24; e.g. 24) | 200, 277 ms, 10.7 KB | Strategy-family notional per time bucket (directional/vol/spread/complex) over N days. | block-rfq/paradigm | `/api/rfq/insights/strategy-rotation?asset=BTC&days=30&bucket_hours=24` |
| `/api/rfq/insights/net-delta-tape` | `asset` (def BTC; e.g. BTC), `hours` (def 168; e.g. 168), `bucket_minutes` (def 60; e.g. 60), `include_perps` (def False; e.g. false) | 200, 686 ms, 13.6 KB | Cumulative net delta of block flow: points[{t_ms,bucket_delta,cum_delta}] per bucket_minutes. | block-rfq/paradigm | `/api/rfq/insights/net-delta-tape?asset=BTC&hours=168&bucket_minutes=60&include_perps=false` |
| `/api/rfq/insights/strike-ladder` | `asset` (def BTC; e.g. BTC), `hours` (def 720; e.g. 720) | 200, 982 ms, 102.4 KB | Block notional by expiry x strike (call/put/total + trade_count) for the window. | block-rfq/paradigm | `/api/rfq/insights/strike-ladder?asset=BTC&hours=720` |
| `/api/rfq/insights/vol-flow-gauge` | `asset` (def BTC; e.g. BTC), `hours` (def 24; e.g. 24) | 200, 237 ms, 127 B | Net vega bought/sold by blocks in the window (many trades may be 'skipped' if IV unavailable). | block-rfq/paradigm | `/api/rfq/insights/vol-flow-gauge?asset=BTC&hours=24` |
| `/api/rfq/insights/iv-prints` | `asset` (def BTC; e.g. BTC), `hours` (def 168; e.g. 168), `limit` (def 2000; e.g. 200) | 200, 261 ms, 32 B | IV prints of block trades (points[]); empty at test time. | block-rfq/paradigm | `/api/rfq/insights/iv-prints?asset=BTC&hours=168&limit=200` |
| `/api/rfq/insights/strategy-bursts` | `asset` (def BTC; e.g. BTC), `window_hours` (def 24; e.g. 24), `baseline_days` (def 14; e.g. 14) | 200, 355 ms, 368 B | Z-score alerts when a strategy code's count in window exceeds its baseline_days history. | block-rfq/paradigm | `/api/rfq/insights/strategy-bursts?asset=BTC&window_hours=24&baseline_days=14` |
| `/api/rfq/insights/trade-decode` | `asset` (e.g. BTC), `rfq_id`* (e.g. drfq-bt_3KV3HrHKTXlL5LMz3aMynErlExE) | 200, 418 ms, 4.9 KB | Decode of a single RFQ by rfq_id: legs, payoff curve (spots, pnl_usd), breakevens, max profit/loss, net greeks. | block-rfq/paradigm | `/api/rfq/insights/trade-decode?asset=BTC&rfq_id=drfq-bt_3KV3HrHKTXlL5LMz3aMynErlExE` |
| `/api/rfq/tg/notional-bars` | `asset` (e.g. BTC), `window_days` (def 7; e.g. 7) | 200, 527 ms, 2 B | Telegram-block analysis: daily notional by strategy (empty array at test time). **Note:** Returned [] for BTC and ETH: dataset empty at test time. | block-rfq/paradigm (ParadigmTgAnalysis panels) | `/api/rfq/tg/notional-bars?asset=BTC&window_days=7` |
| `/api/rfq/tg/strike-heatmap` | `asset` (e.g. BTC), `since_days` (def 30; e.g. 30) | 200, 959 ms, 2 B | Telegram-block analysis: notional by strike x expiry (empty at test time). | block-rfq/paradigm (ParadigmTgAnalysis panels) | `/api/rfq/tg/strike-heatmap?asset=BTC&since_days=30` |
| `/api/rfq/tg/iv-surface` | `asset` (e.g. BTC), `since_days` (def 30; e.g. 30) | 200, 341 ms, 2 B | Telegram-block analysis: average IV by strike x expiry (empty at test time). | block-rfq/paradigm (ParadigmTgAnalysis panels) | `/api/rfq/tg/iv-surface?asset=BTC&since_days=30` |
| `/api/rfq/tg/hourly-heatmap` | `asset` (e.g. BTC) | 200, 871 ms, 8.6 KB | Telegram-block analysis: notional/count by weekday x hour UTC (168 rows, all zeros at test time). | block-rfq/paradigm (ParadigmTgAnalysis panels) | `/api/rfq/tg/hourly-heatmap?asset=BTC` |
| `/api/rfq/tg/block-size-histogram` | `asset` (e.g. BTC) | 200, 876 ms, 638 B | Telegram-block analysis: block-size histogram buckets (all zero at test time). | block-rfq/paradigm (ParadigmTgAnalysis panels) | `/api/rfq/tg/block-size-histogram?asset=BTC` |
| `/api/rfq/tg/strategy-over-time` | `asset` (e.g. BTC), `lookback_months` (def 24; e.g. 24) | 200, 891 ms, 2 B | Telegram-block analysis: monthly strategy share of notional (empty at test time). | block-rfq/paradigm (ParadigmTgAnalysis panels) | `/api/rfq/tg/strategy-over-time?asset=BTC&lookback_months=24` |
| `/api/rfq/tg/big-blocks` | `asset` (e.g. BTC), `min_notional` (def 10000000; e.g. 0), `since_days` (def 7; e.g. 7) | 200, 554 ms, 2 B | Telegram-block analysis: blocks above min_notional in last since_days (empty at test time). | block-rfq/paradigm (ParadigmTgAnalysis panels) | `/api/rfq/tg/big-blocks?asset=BTC&min_notional=0&since_days=7` |
| `/api/rfq/tg/similar-trades` | `asset` (e.g. BTC), `strategy_code`* (e.g. CS), `strike`, `limit` (def 20; e.g. 20) | 200, 271 ms, 5.5 KB | Historical analogs of a strategy_code (+optional strike) from telegram blocks. | block-rfq/paradigm (ParadigmTgAnalysis panels) | `/api/rfq/tg/similar-trades?asset=BTC&strategy_code=CS&limit=20` |
| `/api/rfq/tg/strike-clusters` | `asset` (e.g. BTC), `window_hours` (def 2; e.g. 2), `min_count` (def 3; e.g. 3) | 200, 347 ms, 2 B | Strikes hit by >= min_count institutions inside window_hours (empty at test time). | block-rfq/paradigm (ParadigmTgAnalysis panels) | `/api/rfq/tg/strike-clusters?asset=BTC&window_hours=2&min_count=3` |
| `/api/rfq/tg/put-call-ratio` | `asset` (e.g. BTC), `lookback_days` (def 90; e.g. 90) | 200, 636 ms, 2 B | Daily institutional put/call notional (empty at test time). | block-rfq/paradigm (ParadigmTgAnalysis panels) | `/api/rfq/tg/put-call-ratio?asset=BTC&lookback_days=90` |
| `/api/rfq/tg/expiry-concentration` | `asset` (e.g. BTC), `since_days` (def 90; e.g. 90) | 200, 836 ms, 2 B | Notional concentration by expiry (empty at test time). | block-rfq/paradigm (ParadigmTgAnalysis panels) | `/api/rfq/tg/expiry-concentration?asset=BTC&since_days=90` |
| `/api/rfq/tg/leg-count-distribution` | `asset` (e.g. BTC), `since_days` (def 90; e.g. 90) | 200, 856 ms, 181 B | Distribution of leg counts (1,2,3,4+) with count and notional. | block-rfq/paradigm (ParadigmTgAnalysis panels) | `/api/rfq/tg/leg-count-distribution?asset=BTC&since_days=90` |
| `/api/rfq/tg/instrument-frequency` | `asset` (e.g. BTC), `since_days` (def 90; e.g. 90), `limit` (def 20; e.g. 20) | 200, 257 ms, 2.4 KB | Most-traded instruments from blocks (empty at test time). | block-rfq/paradigm (ParadigmTgAnalysis panels) | `/api/rfq/tg/instrument-frequency?asset=BTC&since_days=90&limit=20` |
| `/api/rfq/tg/strategy-burst-detection` | `asset` (e.g. BTC), `window_minutes` (def 30; e.g. 30), `min_count` (def 3; e.g. 3) | 200, 340 ms, 590 B | Windows where >= min_count same-strategy trades fired within window_minutes. | block-rfq/paradigm (ParadigmTgAnalysis panels) | `/api/rfq/tg/strategy-burst-detection?asset=BTC&window_minutes=30&min_count=3` |

## Futures, basis, funding

| Endpoint | Params (* required) | Verified (status, latency, size) | Returns / notes | Pages | Example (relative) |
|---|---|---|---|---|---|
| `/api/futures/basis` | `asset` (def btc; e.g. btc) | 200, 447 ms, 20.3 KB | All futures/perp contracts for the asset across venues: mark, index, premium_pct, apr_pct, funding, OI, 24h volume, expiry. | futures/basis, futures/term-structure, basis, history, term-structure | `/api/futures/basis?asset=btc` |
| `/api/futures/funding/current` | `asset` (def btc; e.g. btc) | 200, 652 ms, 634 B | Current perp funding by venue: funding_rate_8h, annualised, mark. Empty items for assets without perps (hype). | futures/funding, funding | `/api/futures/funding/current?asset=btc` |
| `/api/futures/funding/history` | `asset` (e.g. btc), `source` (e.g. deribit), `days` (e.g. 30) | 200, 247 ms, 8.2 KB | Funding-rate history points for one venue over N days. | futures/funding, funding | `/api/futures/funding/history?asset=btc&source=binance&days=30` |
| `/api/futures/history` | `asset` (e.g. btc), `instrument`* (e.g. BTC-PERPETUAL), `source` (e.g. deribit), `days` (e.g. 7) | 200, 453 ms, 10.3 KB | Basis (basis_pct, apr_pct, mark) history for one futures instrument over N days. | futures/history, history | `/api/futures/history?asset=btc&instrument=BTC-PERPETUAL&source=deribit&days=7` |

## Orderflow (perp footprint / CVD / liquidations)

| Endpoint | Params (* required) | Verified (status, latency, size) | Returns / notes | Pages | Example (relative) |
|---|---|---|---|---|---|
| `/api/orderflow/footprint` | `asset` (def btc; e.g. btc), `tf` (60\|300\|900\|1800\|3600\|7200; def 60), `limit` (def 60; e.g. 60) | 200, 324 ms, 12.9 KB | Footprint bars from perp futures trades (Bybit BTCUSDT): per bar price levels with buy/sell volume, poc, cum_delta. tf seconds in {60,300,900,1800,3600,7200}. **Note:** tf must be one of 60,300,900,1800,3600,7200 seconds (400/422 otherwise). Data comes from Bybit linear perps; symbol e.g. BTCUSDT. | orderflow-v2, order-flow | `/api/orderflow/footprint?asset=btc&tf=60&limit=20` |
| `/api/orderflow/cvd` | `asset` (def btc; e.g. btc), `limit` (def 500; e.g. 500) | 200, 361 ms, 4.8 KB | Cumulative volume delta points (ts ms, value) + running total. | orderflow-v2 | `/api/orderflow/cvd?asset=btc&limit=100` |
| `/api/orderflow/vd` | `asset` (def btc; e.g. btc), `tf` (60\|300\|900\|1800\|3600\|7200; def 60), `limit` (def 200; e.g. 200) | 200, 272 ms, 10.2 KB | Volume-delta bars bucketed by trade size (bucket_labels: $0-1k ... ) per tf. | orderflow-v2 | `/api/orderflow/vd?asset=btc&tf=60&limit=50` |
| `/api/orderflow/tpo` | `asset` (def btc; e.g. btc), `limit` (def 20; e.g. 20) | 200, 448 ms, 29.0 KB | TPO / market-profile sessions with price-level letters/counts per session. | orderflow-v2 | `/api/orderflow/tpo?asset=btc&limit=5` |
| `/api/orderflow/liquidations` | `asset` (def btc; e.g. btc), `limit` (def 100; e.g. 100) | 200, 259 ms, 5.0 KB | Recent perp liquidation events (ts, side, price, qty, qty_usd, source). | orderflow-v2 | `/api/orderflow/liquidations?asset=btc&limit=50` |
| `/api/orderflow/oi` | `asset` (def btc; e.g. btc), `limit` (def 200; e.g. 200) | 200, 454 ms, 8.4 KB | Perp open-interest time series (value in coin and value_usd, interval). | orderflow-v2 | `/api/orderflow/oi?asset=btc&limit=100` |
| `/api/orderflow/heatmap` | `asset` (def btc; e.g. btc), `snapshots` (def 200; e.g. 200) | 200, 965 ms, 286.5 KB | Order-book liquidity heatmap: timestamps x prices with bid_matrix/ask_matrix (293 KB for 50 snapshots; ~1.1 MB at 200). | orderflow-v2 | `/api/orderflow/heatmap?asset=btc&snapshots=50` |

## Scanner, strategy and strike insight

| Endpoint | Params (* required) | Verified (status, latency, size) | Returns / notes | Pages | Example (relative) |
|---|---|---|---|---|---|
| `/api/scanner/movers` | `tf` (5m\|15m\|30m\|1h\|4h\|1d; def 5m), `limit` (def 10; e.g. 10), `source` (e.g. deribit), `asset` (def btc; e.g. btc) | 200, 661 ms, 1.7 KB | Top option contracts by % price change over tf (5m..1d): [{instrument,source,pct_change,closes[]}]. **Note:** tf pattern ^(5m\|15m\|30m\|1h\|4h\|1d)$. | scanner | `/api/scanner/movers?tf=5m&limit=10&source=deribit&asset=btc` |
| `/api/scanner/expiries` | `source` (e.g. deribit), `asset` (def btc; e.g. btc) | 200, 252 ms, 1.3 KB | Expiry list for the scanner with strike_count, total_oi, last_ts. | scanner | `/api/scanner/expiries?source=deribit&asset=btc` |
| `/api/scanner/chart` | `instrument`* (e.g. BTC-11OCT26-83000-C), `source` (e.g. deribit), `tf` (5m\|15m\|30m\|1h\|4h\|1d; def 5m), `limit` (def 500; e.g. 100), `asset` (def btc; e.g. btc) | 200, 703 ms, 31.7 KB | OHLC (+USD OHLC, IV, OI averages) bars for one option instrument; limit must be >= 10. **Note:** limit >= 10 enforced (422). tf pattern ^(5m\|15m\|30m\|1h\|4h\|1d)$. | scanner, dashboard, strike-insight | `/api/scanner/chart?instrument=BTC-11OCT26-83000-C&source=deribit&tf=5m&limit=100&asset=btc` |
| `/api/strategy/picks` | `source`* (e.g. deribit), `expiry`* (e.g. 2026-10-11), `bias` (bearish\|bullish\|long_vol\|neutral\|short_vol), `limit` (def 5; e.g. 5), `asset` (def btc; e.g. btc) | 200, 560 ms, 16.6 KB | Ranked multi-leg strategy ideas for a bias on one expiry (butterflies, spreads ...) with legs, net_cost, max_loss/gain, POP, EV, greeks, plus risk-neutral density. | strategy | `/api/strategy/picks?source=deribit&expiry=2026-10-11&bias=bullish&limit=5&asset=btc` |
| `/api/strategy/scan` | `source`* (e.g. deribit), `bias` (bearish\|bullish\|long_vol\|neutral\|short_vol), `target_pct` (e.g. 5), `max_dte` (e.g. 14), `cross_expiry` (def False; e.g. false), `asset` (def btc; e.g. btc) | 200, 403 ms, 10.8 KB | Cross-expiry strategy scan for a bias/target_pct/max_dte: results[], sources_checked, expiries_scanned. | strategy/scan | `/api/strategy/scan?source=deribit&bias=bullish&target_pct=5&max_dte=14&cross_expiry=false&asset=btc` |
| `/api/market/strike-insight` | `asset` (e.g. BTC), `expiry`* (e.g. 2026-10-11), `strike`* (e.g. 83000), `source` (e.g. deribit), `window` (24h\|7d\|30d\|90d) | 200, 266 ms, 774 B | Per-strike call/put insight: greeks, tape flow (buy/sell volume & premium), turnover ratio, RFQ strategies touching the strike. window is not validated server-side (SPA uses 24h\|7d\|30d\|90d). **Note:** window not validated (invalid value still 200 and echoed). | strike-insight, strike | `/api/market/strike-insight?asset=btc&expiry=2026-10-11&strike=83000&source=deribit&window=24h` |
| `/api/market/strike-insight/history` | `asset` (e.g. BTC), `expiry`* (e.g. 2026-10-11), `strike`* (e.g. 83000), `option_type`* (C\|P), `source` (e.g. deribit), `window` (24h\|7d\|30d\|90d) | 200, 969 ms, 6.0 KB | Bucketed price/IV/OI history of one strike & option_type over the window (bucket_ms + buckets[]). | strike-insight | `/api/market/strike-insight/history?asset=btc&expiry=2026-10-11&strike=83000&option_type=C&source=deribit&window=24h` |
| `/api/market/strike-insight/events` | `asset` (e.g. BTC), `expiry`* (e.g. 2026-10-11), `strike`* (e.g. 83000), `option_type`* (C\|P), `source` (e.g. deribit), `window` (24h\|7d\|30d\|90d), `limit` (e.g. 20), `offset` (e.g. 0) | 200, 324 ms, 2.7 KB | Paginated list of trade events for one strike (total, limit, offset, events[]). | strike-insight | `/api/market/strike-insight/events?asset=btc&expiry=2026-10-11&strike=83000&option_type=C&source=deribit&window=24h&limit=20&offset=0` |
| `/api/market/strike-insight/rfq-strategies` | `asset` (e.g. BTC), `expiry`* (e.g. 2026-10-11), `strike`* (e.g. 83000), `window` (24h\|7d\|30d\|90d), `source` (e.g. deribit) | 200, 325 ms, 547 B | Block/RFQ strategies that included this strike in the window; source optional (null = aggregate). | strike-insight | `/api/market/strike-insight/rfq-strategies?asset=btc&expiry=2026-10-11&strike=83000&window=24h` |

## Backtest

| Endpoint | Params (* required) | Verified (status, latency, size) | Returns / notes | Pages | Example (relative) |
|---|---|---|---|---|---|
| `/api/backtest/meta` | `asset` (e.g. btc), `source` (e.g. deribit) | 200, 1394 ms, 244.3 KB | Backtest data catalogue: data window (~97 d), expiries with calls/puts instruments & first/last candle timestamps. 250 KB. | backtest | `/api/backtest/meta?asset=btc&source=deribit` |
| `/api/backtest/spot-at` | `asset` (e.g. btc), `source` (e.g. deribit), `ts_ms`* (e.g. 1791543325417) | 200, 803 ms, 61 B | Historic spot at ts_ms: {spot, spot_ts_ms, is_stale}. | backtest | `/api/backtest/spot-at?asset=btc&source=deribit&ts_ms=1791543325417` |
| `/api/backtest/v2/meta` | `asset` (e.g. btc), `source` (e.g. deribit) | 401, 261 ms, 26 B | v2 backtest catalogue. Requires bearer token. **Note:** 401 without bearer token. | backtest | `/api/backtest/v2/meta?asset=btc&source=deribit` |

## Posts

| Endpoint | Params (* required) | Verified (status, latency, size) | Returns / notes | Pages | Example (relative) |
|---|---|---|---|---|---|
| `/api/posts` | - | 200, 249 ms, 12 B | Daily commentary posts list {posts:[]} (empty at test time). /api/posts/{id} fetches one. | posts, posts/:date | `/api/posts` |
| `/api/posts/{id}` | `id`* | - | Single post by id (list is empty so id format unknown). Not called. **Note:** untested: /api/posts returns {posts:[]} | posts/:date | `` |

## Health / sources

| Endpoint | Params (* required) | Verified (status, latency, size) | Returns / notes | Pages | Example (relative) |
|---|---|---|---|---|---|
| `/api/rfq/telegram/health` | - | 200, 362 ms, 76 B | Health of the Telegram block feed ingester: connected, last_message_ms, error, phase. | blocks, paradigm-flow, rfq-tape | `/api/rfq/telegram/health` |
| `/api/rfq/deribit/health` | - | 200, 330 ms, 76 B | Health of the Deribit block feed. | blocks, paradigm-flow, rfq-tape | `/api/rfq/deribit/health` |
| `/api/rfq/paradigm/health` | - | 200, 276 ms, 65 B | Health of the Paradigm (legacy) feed; connected=false at test time. | blocks, paradigm-flow, rfq-tape, block-rfq/paradigm | `/api/rfq/paradigm/health` |
| `/api/rfq/paradigm-drfq/health` | - | 200, 259 ms, 78 B | Health of the Paradigm DRFQ feed. | blocks, paradigm-flow, rfq-tape, block-rfq/paradigm | `/api/rfq/paradigm-drfq/health` |
| `/api/rfq/paradigm-ob/health` | - | 200, 265 ms, 78 B | Health of the Paradigm orderbook feed. | blocks, paradigm-flow, rfq-tape, block-rfq/paradigm | `/api/rfq/paradigm-ob/health` |
| `/api/health/sources/history` | `hours` (def 24; e.g. 24) | 401, 242 ms, 26 B | Per-venue connectivity history strip. Requires bearer token (401) although the Sources page shows it. **Note:** 401 without bearer token. | sources | `/api/health/sources/history?hours=24` |
| `/api/sources` | - | 200, 259 ms, 1.3 KB | Live connectivity of each options data venue: enabled, connected, last_message_ms, upstream ws_url. Public. | sources | `/api/sources` |

## IBIT (BlackRock Bitcoin ETF options, ThetaData)

| Endpoint | Params (* required) | Verified (status, latency, size) | Returns / notes | Pages | Example (relative) |
|---|---|---|---|---|---|
| `/api/ibit/chain/all` | - | 200, 1929 ms, 1.19 MB | Full IBIT (BlackRock Bitcoin ETF) options chain from ThetaData: contracts[2,962] with bid/ask/mark/IV/greeks/OI. 1.2 MB. **Note:** IBIT implied_volatility is a FRACTION (0.49 = 49%) unlike the crypto endpoints which return percent points. | ibit/* | `/api/ibit/chain/all` |
| `/api/ibit/spot` | `tf` (1m\|5m\|15m\|30m\|1H\|4H\|1D; def 1D) | 200, 992 ms, 64.8 KB | IBIT daily/intraday candles {ticker,candles[{ts_ms,open,high,low,close,volume}]}. | ibit/chart, ibit/* | `/api/ibit/spot?tf=1D` |
| `/api/ibit/spot-ref` | `tf` (1m\|5m\|15m\|30m\|1H\|4H\|1D) | 200, 3226 ms, 57.5 KB | BTC reference bars aligned to IBIT bars (close, hlc3, venues used) for premium/discount calcs. | ibit/chart | `/api/ibit/spot-ref?tf=5m` |
| `/api/ibit/dealer-gex` | `model` (flow\|naive), `window` (all\|30\|7) | 200, 1923 ms, 33.2 KB | IBIT dealer GEX model: totals, regime, key levels (flip/support/resistance) and ladder per strike. | ibit/greeks | `/api/ibit/dealer-gex?model=flow&window=all` |
| `/api/ibit/gex-map` | `model` (flow\|naive), `window` (all\|30\|7), `bar` (1d\|30m), `greek` (def gamma) | 200, 1785 ms, 675.7 KB | IBIT GEX/charm map over time: times (epoch s), s_grid, matrix. 690 KB. | ibit/greeks | `/api/ibit/gex-map?model=flow&window=all&bar=1d` |
| `/api/ibit/flow-agg` | `window_h` (e.g. 24) | 200, 1664 ms, 266.2 KB | IBIT options flow aggregate for window_h (same shape as /api/market/flow-agg). | ibit/flow | `/api/ibit/flow-agg?window_h=24` |
| `/api/ibit/flow-wheel` | `sessions` (def 7; e.g. 7) | 200, 852 ms, 481 B | IBIT taker flow by calls/puts bought/sold in contracts, premium, notional over N sessions. | ibit/flow | `/api/ibit/flow-wheel?sessions=7` |
| `/api/ibit/iv-rank` | - | 200, 261 ms, 8.2 KB | IBIT IV rank/percentile with history (365 d). | ibit/vol | `/api/ibit/iv-rank` |
| `/api/ibit/oi-history` | `days` (def 180; e.g. 180) | 200, 1903 ms, 441.6 KB | IBIT open interest by date x strike (contracts, multiplier 100). 450 KB. | ibit/oi | `/api/ibit/oi-history?days=180` |
| `/api/ibit/spot-vol-skew` | `bar` (1d\|1h\|30m\|15m\|5m) | 200, 605 ms, 50.9 KB | Intraday points [ts_ms, spot, iv, skew] per bar. | ibit/vol | `/api/ibit/spot-vol-skew?bar=1h` |
| `/api/ibit/trades` | `limit` (e.g. 100) | 200, 566 ms, 34.8 KB | IBIT option trade tape (ThetaData) newest first; rows in the same schema as /api/market/trades/aggregate. | ibit/flow | `/api/ibit/trades?limit=100` |
| `/api/ibit/vrp` | `bar` (1d\|1h), `lookback_days` (e.g. 365) | 200, 958 ms, 23.3 KB | IBIT variance risk premium: current iv30/rv20/rv30/vrp and series. | ibit/vol | `/api/ibit/vrp?bar=1d&lookback_days=365` |
| `/api/ibit/btc-iv-spread` | `bar` (1d\|1h), `sources` (e.g. deribit), `lookback_days` (e.g. 365) | 200, 775 ms, 8.3 KB | IBIT IV vs BTC IV (per venue) spread time series. | ibit/vol | `/api/ibit/btc-iv-spread?bar=1d&sources=deribit&lookback_days=365` |

## Meta / bootstrap

| Endpoint | Params (* required) | Verified (status, latency, size) | Returns / notes | Pages | Example (relative) |
|---|---|---|---|---|---|
| `/api/market/sources-all` | - | 200, 394 ms, 3.2 KB | Catalog of every underlying the backend knows (crypto + ~30 equities/ETFs) with the venues that list options for it and the default venue. Bootstrap for the SPA; use it to validate asset/source combos. | (all - bootstrap) | `/api/market/sources-all` |
| `/api/market/dashboard-init` | `asset` (def btc; e.g. btc) | 200, 244 ms, 1.9 KB | Bootstrap payload for the dashboard: sources list, spot (empty at test), per-venue expiries, front_month summary. Not referenced by name in the bundle (only in the cache-policy list) but live. **Note:** Undocumented in the bundle (name only appears in a TTL rule). | dashboard (bootstrap; not referenced in bundle, only in cache-policy list) | `/api/market/dashboard-init?asset=btc` |
| `/api/site-notice` | - | 404, 242 ms, 0 B | Optional site-wide banner JSON; 404 when no notice is active. | (banner on all pages) | `/api/site-notice` |
| `/api/og` | `asset` (def btc; e.g. btc) | 200, 677 ms, 34.9 KB | Open Graph PNG image for the asset (binary, ~36 KB). | (Open Graph image) | `/api/og?asset=btc&v=3` |

## POST endpoints

### POST `/api/backtest/run`

- Verified: 200, 1544 ms, 161.1 KB. Auth required: False.
- Query: `asset`* (e.g. btc)
- Body: `{"asset": "btc", "source": "deribit", "legs": [{"instrument": "BTC-9OCT26-82000-C", "direction": "long|short"}], "entry_ts_ms": 1791273600000, "exit_rule": "fixed_ts|dte_exit|pct_profit|loss_stop", "exit_ts_ms": "(fixed_ts)", "exit_pct_profit": "(pct_profit, fraction e.g. 0.5)", "exit_dte": "(dte_exit, int)", "exit_loss_type": "(loss_stop) pct_premium|mult_premium", "exit_loss_value": "(loss_stop, float)", "fill_mode": "mark|bidask", "apply_fees": false}`
- Response: `{entry:{ts_ms,spot,premium_usd,net_delta,net_gamma,net_theta_per_day,net_vega_per_1pct,iv,dte,entry_gap_minutes,entry_fee_usd},exit:{ts_ms,spot,pnl_usd,pnl_pct,exit_reason,dte,max_loss_unbounded,exit_bar_unreliable,exit_fee_usd,pnl_usd_after_fees,pnl_pct_after_fees,structural_max_loss_usd,structural_max_profit_usd,pnl_exceeds_max_loss,pnl_exceeds_max_profit,settled_at_intrinsic},series:[N x {ts_ms,spot,spot_open,spot_high,spot_low,pnl_usd,delta_pnl_usd,theta_pnl_usd,vega_pnl_usd,gamma_pnl_usd,unexplained_pnl_usd,iv,dte}]}`
- Options position backtest on stored 5-minute candles (~97 days). Instruments come from /api/backtest/meta (note unpadded day: BTC-9OCT26-82000-C). Works without login. Called once with a 1-leg long call, 2-day hold: 161 KB, 1.5 s. Error bodies are plain-text JSON {detail} (e.g. 'No option_candles data for instruments=...'). legs max 2 in the UI (spreads/straddles).

### POST `/api/backtest/v2/hedge`

- Verified: 401, 257 ms, 26 B. Auth required: True.
- Query: -
- Body: `"{spec:{...v2 backtest spec},...extra}  (exact spec not recoverable from bundle without login flows)"`
- Response: `{detail:str} (401 Missing token)`
- Delta-hedge backtest (v2). Called once with {} body: 401 => requires bearer token. 

## WebSocket endpoints (host `wss://ex63.derivativesmonkey.com`)

### `/api/ws/spot`

- URL: `wss://ex63.derivativesmonkey.com/api/ws/spot?asset=btc`
- Query: `asset` (btc default; omitted for btc), `sources` (csv of venues; omitted = all)
- Messages: server->client: {type:'snapshot',rows:[{source,asset,price,ts_ms,recv_ts_ms}]}, {type:'snapshot_complete',count}, {type:'spot',row:{source,asset,ts_ms,recv_ts_ms,price}}, {type:'lag',dropped}, {type:'ping',ts_ms}; client->server: {type:'auth',token}, {type:'pong',ts_ms}
- WebSocket. VERIFIED: connected to ex63 without auth message; first frame (after ~1.8 s) was snapshot (11 venues), then snapshot_complete, then a stream of per-venue spot ticks (several per second across 11 venues).

### `/api/ws/trades`

- URL: `wss://ex63.derivativesmonkey.com/api/ws/trades`
- Query: `asset` (btc default), `sources` (csv), `backfill` (int number of historical trades to replay first)
- Messages: server->client: {type:'backfill',row}, {type:'backfill_complete'}, {type:'trade',row}, {type:'lag',dropped}, {type:'ping',ts_ms}, {type:'pong'}; row has the /api/market/trades/aggregate row schema. client: auth/pong.
- WebSocket. not connected (bundle only)

### `/api/ws/chain`

- URL: `wss://ex63.derivativesmonkey.com/api/ws/chain`
- Query: `source` (required venue), `expiry` (required YYYY-MM-DD), `asset` (required)
- Messages: server->client: {type:'snapshot',rows:[{strike,call:{...},put:{...}}]}, {type:'patch',updates:[{strike,option_type:'C'|'P',slice:{...}}]}, {type:'ping'}; client: {type:'auth',token}. SPA falls back to REST polling every 10 s when not open.
- WebSocket. not connected (bundle only)

### `/api/ws/divergence`

- URL: `wss://ex63.derivativesmonkey.com/api/ws/divergence`
- Query: `asset` (btc default), `metric` (divergence metric name (iv|basis|freshness|gamma assumed from REST twin; not verified)), `backfill` (int)
- Messages: server->client: {type:'backfill',row}, {type:'backfill_complete'}, {type:'divergence',row}, {type:'lag'}, {type:'ping'}; client sends {type:'auth',token} (connection closed 'token not ready' if no token available in SPA, so likely auth-gated).
- WebSocket. not connected (bundle only)

### `/api/ws/orderflow`

- URL: `wss://ex63.derivativesmonkey.com/api/ws/orderflow`
- Query: `asset` (btc default), `channels` (csv of trade,book,liq,oi,heatmap)
- Messages: server->client: {type:'snapshot',channel,rows}, {type:'snapshot_complete'}, channel messages {type:'trade'|'book'|'liq'|'oi'|'heatmap',row}, {type:'lag'}, {type:'ping'}/{type:'pong'}; client: {type:'auth',token}, {type:'resubscribe',asset,channels:[...]}
- WebSocket. not connected (bundle only)

### `/api/market/mbvi-live`

- URL: `wss://www.derivativesmonkey.com/api/market/mbvi-live`
- Query: `asset` (btc default), `source` (computed (default) | deribit | derive | bybit | binance | thalex | okx)
- Messages: server->client: {type:'tick',value,ts_ms} (MBVI vol index ticks). Same-origin ws (uses window.location.host, i.e. www host), auto-reconnect 3 s.
- WebSocket. not connected (bundle only)

Shared client protocol (`make-ws-client`): the SPA opens the socket then immediately sends `{"type":"auth","token":"<Auth0 JWT or empty string>"}`; server `{"type":"ping","ts_ms":N}` must be answered with `{"type":"pong","ts_ms":N}`; client treats >30 s without ping as dead and reconnects with exponential backoff 1 s -> 16 s; close code 4403 = auth refused (no reconnect). Live check: `ws/spot` streamed fine with no auth frame at all (anonymous OK for spot).

## Excluded: requires account / write (not called)

- `/api/user/panel-settings` [GET/PATCH] - per-user panel settings (asset query); needs Auth0 bearer
- `/api/user/dashboard-layout` [GET/PUT] - per-user dashboard layout (asset query); needs Auth0 bearer
- `/api/auth/sync` [POST] - Auth0 -> backend session sync (Bearer + credentials:include); returns {role}
- `/api/positions` [GET/POST] - saved user positions
- `/api/positions/price` [POST] - price a saved position {asset,source,legs}
- `/api/positions/{id}` [DELETE] - delete saved position
- `/api/alerts` [GET] - user alerts feed (limit,type,asset)
- `/api/poster/draft` [GET/POST] - admin social-post drafting
- `/api/feedback` [POST] - public feedback form {message,name,email,website,page}; write endpoint, not called

## Auth-required GET endpoints (401 "Missing token" without Auth0 bearer)

- `/api/quant/regime`
- `/api/quant/direction`
- `/api/quant/diagnostics`
- `/api/quant/anomaly/recent`
- `/api/backtest/v2/meta`
- `/api/health/sources/history`

The SPA `Y()` wrapper adds `Authorization: Bearer <token>` only when logged in; on 401 it retries once then redirects to `/`. Everything else is called with the plain `fetch`.

## Slow (> 3 s) or huge (> 500 KB) endpoints

| Endpoint | Worst latency seen | Worst size seen | Comment |
|---|---|---|---|
| `/api/market/gex-profile-live` | 3.5 s | 193.9 KB | first-call latency; typically faster when warm |
| `/api/market/gex-strike-heatmap` | 10.9 s | 208.9 KB | first-call latency; typically faster when warm |
| `/api/market/greek-exposure-projection` | 3.7 s | 1.79 MB | first-call latency; typically faster when warm |
| `/api/market/oi-strike-heatmap` | 30.1 s | 478.5 KB | first-call latency; typically faster when warm |
| `/api/market/dealer-positioning` | 3.6 s | 25.2 KB | first-call latency; typically faster when warm |
| `/api/market/skew-sparklines` | 5.6 s | 25.93 MB | first-call latency; typically faster when warm |
| `/api/market/iv-term-history/aggregate` | 1.7 s | 580.0 KB |  |
| `/api/market/iv-surface-history` | 2.0 s | 1.18 MB |  |
| `/api/market/flow-map-bins` | 5.4 s | 3.93 MB | first-call latency; typically faster when warm |
| `/api/market/flow-agg` | 1.6 s | 501.5 KB |  |
| `/api/scanner/expiries` | 7.7 s | 2.2 KB | first-call latency; typically faster when warm |
| `/api/rfq/stats` | 3.0 s | 333 B | first-call latency; typically faster when warm |
| `/api/rfq/strategy-popularity` | 3.4 s | 8.5 KB | first-call latency; typically faster when warm |
| `/api/orderflow/heatmap` | 2.4 s | 1.10 MB |  |
| `/api/ibit/chain/all` | 2.7 s | 1.19 MB |  |
| `/api/ibit/spot-ref` | 4.4 s | 57.5 KB | first-call latency; typically faster when warm |
| `/api/ibit/gex-map` | 1.8 s | 675.7 KB |  |

Latencies are from one cold-ish pass (default-params pass and a tuned pass). Typical fast endpoints are 250-600 ms (network floor ~250 ms). Others >1 s: `market/chain-latest`, `market/thermography`, `market/iv-surface-history`, `market/svi-full-surface`, `market/flow-agg`, `volume-flow/net-premium`, `backtest/meta`, `ibit/chain/all`, `ibit/dealer-gex`, `ibit/gex-map`, `ibit/flow-agg`, `ibit/oi-history`.

## Broken, erroring or empty

- `GET /api/market/orderbook` => 404 `no order book for <instrument>` for every instrument/venue tried (bullish/paradex/derive/deribit); `/orderbook/instruments` ignores `source` and always lists the Bullish USDC instruments (~1,400). The page says L2 depth is captured only from Bullish; the pipeline appeared empty.
- `GET /api/site-notice` => 404 (no active banner; SPA treats as none).
- `GET /api/market/pnl-surface` returns 400 if `option_type=C` (needs `call`/`put`).
- Empty at test time (200 with `[]`): `/api/rfq/tg/` notional-bars, strike-heatmap, iv-surface, strategy-over-time, big-blocks, strike-clusters, put-call-ratio, expiry-concentration, instrument-frequency (also empty for ETH); zero-filled: tg/hourly-heatmap, tg/block-size-histogram, tg/leg-count-distribution; non-empty: tg/strategy-burst-detection (7), tg/similar-trades (20); `/api/rfq/insights/iv-prints` (`points:[]`); `/api/rfq/insights/vol-flow-gauge` (all 33 trades skipped, zeros); `/api/posts` (`{posts:[]}`); `/api/futures/funding/current?asset=hype` (items []); `/api/market/dashboard-init` (`spot:[]`); `/api/market/mbvi-candles?source=<unknown>` (candles [], took 12.8 s).
- `GET /api/rfq/paradigm/health` => `connected:false` (legacy Paradigm feed down; drfq/ob/telegram/deribit feeds are connected).
- Cold-start flake: `/api/market/oi-strike-heatmap` timed out at 30 s once (default sources), then 2.7 s with `sources=deribit`.
- Server returns 200 + defaults for unvalidated enum params (strike-insight `window`, dealer-positioning `signing`, greek-exposure-projection `bucket`/`agg`, rfq `status`/`source`, spot-candles `source`), so typos fail silently.

## Spot checks: ETH / HYPE / XAUT / casing

| Probe | Request | Result |
|---|---|---|
| fix pnl-surface | `/api/market/pnl-surface?asset=BTC&strike=83000&option_type=call&expiry=2026-10-11&contracts=1` | 200, 274 ms, 3.8 KB; {asset:str,strike:float,option_type:str,expiry:str,entry_spot:float,entry_price_usd:float,sigma:float,spot_ste |
| fix orderbook default instr | `/api/market/orderbook?source=deribit&instrument=BTC-11OCT26-83000-C&asset=btc&depth=10` | 404, 380 ms, 52 B; {"detail": "no order book for 'BTC-11OCT26-83000-C'"} |
| fix orderbook ins default src | `/api/market/orderbook/instruments` | 200, 1056 ms, 142.9 KB; [1384 x {instrument:str,expiry_date:str,strike:float,option_type:str}] |
| tg eth notional-bars | `/api/rfq/tg/notional-bars?asset=ETH&window_days=30` | 200, 965 ms, 2 B; [] |
| tg btc big-blocks 90d | `/api/rfq/tg/big-blocks?asset=BTC&min_notional=0&since_days=90` | 200, 735 ms, 2 B; [] |
| eth expiries deribit | `/api/market/expiries?source=deribit&asset=eth` | 200, 342 ms, 189 B; {source:str,expiries:[12 x str]} |
| eth chain deribit | `/api/market/chain?source=deribit&expiry=2026-10-11&asset=eth` | 200, 417 ms, 29.2 KB; {provenance:{source:str,expiry_date:str,count:int,ts_ms_min:int,ts_ms_max:int},rows:[38 x {...3 keys}]} |
| eth gex-profile | `/api/market/gex-profile?sources=deribit&asset=eth` | 200, 730 ms, 14.6 KB; {sources:[1 x str],spot:float,items:[89 x {...7 keys}]} |
| eth term-structure | `/api/market/term-structure?sources=deribit&asset=eth` | 200, 489 ms, 1.2 KB; {provenance:{sources:[1 x str],points_count:int,per_source:{...1 keys}},points:[12 x {...4 keys}]} |
| eth rfq trades ETH | `/api/rfq/trades?asset=ETH&limit=2` | 200, 348 ms, 1.5 KB; [2 x {rfq_id:str,source:str,status:str,asset:str,timestamp_ms:int,updated_ms:int,legs:[1 x {...9 keys}],mark_p |
| eth rfq trades eth(lower) | `/api/rfq/trades?asset=eth&limit=2` | 200, 255 ms, 1.5 KB; [2 x {rfq_id:str,source:str,status:str,asset:str,timestamp_ms:int,updated_ms:int,legs:[1 x {...9 keys}],mark_p |
| btc rfq trades btc(lower) | `/api/rfq/trades?asset=btc&limit=2` | 200, 352 ms, 1.6 KB; [2 x {rfq_id:str,source:str,status:str,asset:str,timestamp_ms:int,updated_ms:int,legs:[1 x {...9 keys}],mark_p |
| eth funding current | `/api/futures/funding/current?asset=eth` | 200, 260 ms, 590 B; {asset:str,items:[4 x {...5 keys}]} |
| eth vol-cone upper | `/api/market/vol-cone?asset=ETH` | 200, 2461 ms, 1009 B; {asset:str,spot:float,cones:[5 x {...9 keys}],windows:[5 x int],generated_at:str} |
| btc vol-cone lower | `/api/market/vol-cone?asset=btc` | 200, 341 ms, 1008 B; {asset:str,spot:float,cones:[5 x {...9 keys}],windows:[5 x int],generated_at:str} |
| btc gex-profile UPPER | `/api/market/gex-profile?sources=deribit&asset=BTC` | 200, 595 ms, 15.1 KB; {sources:[1 x str],spot:float,items:[91 x {...7 keys}]} |
| hype expiries derive | `/api/market/expiries?source=derive&asset=hype` | 200, 348 ms, 149 B; {source:str,expiries:[9 x str]} |
| hype expiries deribit | `/api/market/expiries?source=deribit&asset=hype` | 200, 267 ms, 124 B; {source:str,expiries:[7 x str]} |
| hype gex-profile derive | `/api/market/gex-profile?sources=derive&asset=hype` | 200, 530 ms, 9.8 KB; {sources:[1 x str],spot:float,items:[61 x {...7 keys}]} |
| hype gex-profile default | `/api/market/gex-profile?asset=hype` | 200, 957 ms, 29.2 KB; {sources:[5 x str],spot:float,items:[184 x {...7 keys}]} |
| hype term-structure derive | `/api/market/term-structure?sources=derive&asset=hype` | 200, 497 ms, 1.0 KB; {provenance:{sources:[1 x str],points_count:int,per_source:{...1 keys}},points:[9 x {...4 keys}]} |
| hype spot | `/api/market/spot?asset=hype` | 200, 345 ms, 493 B; [5 x {source:str,price:float,ts_ms:int,recv_ts_ms:int,age_ms:int}] |
| hype rfq stats HYPE | `/api/rfq/stats?asset=HYPE&hours=24` | 200, 261 ms, 328 B; {total:int,filled:int,open:int,canceled:int,expired:int,notional_usd:float,buy_notional_usd:float,sell_notiona |
| hype funding | `/api/futures/funding/current?asset=hype` | 200, 262 ms, 27 B; {asset:str,items:[]} |
| hype vol-cone | `/api/market/vol-cone?asset=HYPE` | 200, 1627 ms, 1007 B; {asset:str,spot:float,cones:[5 x {...9 keys}],windows:[5 x int],generated_at:str} |
| hype orderflow | `/api/orderflow/cvd?asset=hype&limit=3` | 200, 349 ms, 236 B; {asset:str,symbol:str,source:str,running:float,points:[3 x {...2 keys}]} |
| xaut expiries derive | `/api/market/expiries?source=derive&asset=xaut` | 200, 253 ms, 97 B; {source:str,expiries:[5 x str]} |
| xaut term-structure derive | `/api/market/term-structure?sources=derive&asset=xaut` | 200, 335 ms, 616 B; {provenance:{sources:[1 x str],points_count:int,per_source:{...1 keys}},points:[5 x {...4 keys}]} |
| xaut spot | `/api/market/spot?asset=xaut` | 200, 296 ms, 496 B; [5 x {source:str,price:float,ts_ms:int,recv_ts_ms:int,age_ms:int}] |
| xaut funding | `/api/futures/funding/current?asset=xaut` | 200, 1303 ms, 315 B; {asset:str,items:[2 x {...5 keys}]} |
| xaut orderflow | `/api/orderflow/cvd?asset=xaut&limit=3` | 200, 247 ms, 237 B; {asset:str,symbol:str,source:str,running:float,points:[3 x {...2 keys}]} |
| xaut vol-cone | `/api/market/vol-cone?asset=XAUT` | 200, 1307 ms, 977 B; {asset:str,spot:float,cones:[5 x {...9 keys}],windows:[5 x int],generated_at:str} |
| spy expiries thetadata | `/api/market/expiries?source=thetadata&asset=spy` | 200, 2143 ms, 464 B; {source:str,expiries:[33 x str]} |
| sol expiries default sources | `/api/market/expiries-all?asset=sol` | 200, 254 ms, 586 B; {derive:[7 x str],deribit:[7 x str],binance:[4 x str],bybit:[7 x str],okx:[],thalex:[],paradex:[7 x str],aevo: |

### Validation / enum probes (invalid value sent, server message shows allowed set)

| Probe | Request | Result |
|---|---|---|
| enum gex view | `/api/market/gex?source=deribit&expiry=2026-10-11&view=zzz` | 422; {"detail": "view must be 'standard' or 'corrected'"} |
| enum dealer signing | `/api/market/dealer-positioning?asset=btc&signing=zzz` | 200; {asset:str,sources:[12 x str],spot:float,signing:str,by_strike:[137 x {...9 keys}],by_expiry:[14 x {...10 keys}],flow_coverage:{pct_flow_signed:float,avg_confidence:float,trade_count:float,flipped:float,instruments_signed:float,in |
| enum oi-change breakdown | `/api/market/oi-change?breakdown=zzz` | 422; {"detail": [{"type": "string_pattern_mismatch", "loc": ["query", "breakdown"], "msg": "String should match pattern '^(total/calls_puts)$'", "input": "zzz", "ctx": {"pattern": "^(total/calls_puts)$"}}]} |
| enum strike-insight window | `/api/market/strike-insight?asset=btc&expiry=2026-10-11&strike=83000&source=deribit&window=zzz` | 200; {asset:str,expiry:str,strike:float,source:str,window:str,call:{greeks:{...7 keys},tape_flow:{...4 keys},turnover_ratio:float},put:{greeks:{...7 keys},tape_flow:{...4 keys},turnover_ratio:float},rfq_strategies:[1 x {...3 keys}],rfq |
| enum scanner tf | `/api/scanner/movers?tf=zzz` | 422; {"detail": [{"type": "string_pattern_mismatch", "loc": ["query", "tf"], "msg": "String should match pattern '^(5m/15m/30m/1h/4h/1d)$'", "input": "zzz", "ctx": {"pattern": "^(5m/15m/30m/1h/4h/1d)$"}}]} |
| enum spot-candles tf | `/api/market/spot-candles?asset=BTC&tf=zzz` | 422; {"detail": "Unknown tf 'zzz'. Valid values: ['12H', '15m', '1D', '1H', '1M', '1W', '1m', '2H', '30m', '3m', '4H', '5m', '6H']"} |
| enum spot-candles source | `/api/market/spot-candles?asset=BTC&tf=1D&source=zzz&limit=5` | 200; {asset:str,tf:str,source:str,candles:[5 x {...7 keys}]} |
| enum time-at-price tf | `/api/market/time-at-price-kline?asset=BTC&tf=zzz` | 422; {"detail": "Unknown tf 'zzz'. Valid values: ['12H', '15m', '1D', '1H', '1M', '1W', '1m', '2H', '30m', '3m', '4H', '5m', '6H']"} |
| enum mbvi resolution | `/api/market/mbvi-candles?asset=btc&resolution=zzz` | 422; {"detail": "resolution 'zzz' not supported. Valid: ['15m', '1D', '1H', '1M', '1W', '1m', '2H', '30m', '3m', '4H', '5m']"} |
| enum mbvi source | `/api/market/mbvi-candles?asset=btc&source=zzz` | 200; {asset:str,resolution:str,candles:[]} |
| enum net-premium scope | `/api/volume-flow/net-premium?asset=BTC&scope=zzz` | 422; {"detail": [{"type": "literal_error", "loc": ["query", "scope"], "msg": "Input should be 'screen', 'block' or 'both'", "input": "zzz", "ctx": {"expected": "'screen', 'block' or 'both'"}}]} |
| enum strategy bias | `/api/strategy/picks?source=deribit&expiry=2026-10-11&bias=zzz&asset=btc` | 400; {"detail": "unknown bias: 'zzz' (expected one of ['bearish', 'bullish', 'long_vol', 'neutral', 'short_vol'])"} |
| enum thermography greek | `/api/market/thermography?asset=btc&source=deribit&greek=zzz` | 422; {"detail": "Unknown greek 'zzz'. Valid: ['charm_exposure', 'gamma_exposure', 'vanna_exposure', 'vega_exposure']"} |
| enum gep bucket | `/api/market/greek-exposure-projection?asset=BTC&source=deribit&bucket=zzz` | 200; {asset:str,source:str,spot:float,computed_at:str,timestamps:[361 x str],anchor_ts:int,projection_start_idx:int,spot_history:[14 x {...5 keys}],s_grid:[168 x float],gamma_matrix:[168 x [361 x float]],charm_matrix:[168 x [361 x floa |
| enum gep agg | `/api/market/greek-exposure-projection?asset=BTC&source=deribit&agg=zzz` | 200; {asset:str,source:str,spot:float,computed_at:str,timestamps:[361 x str],anchor_ts:int,projection_start_idx:int,spot_history:[14 x {...5 keys}],s_grid:[168 x float],gamma_matrix:[168 x [361 x float]],charm_matrix:[168 x [361 x floa |
| enum rfq status | `/api/rfq/trades?asset=BTC&limit=1&status=zzz` | 200; [] |
| enum rfq source | `/api/rfq/trades?asset=BTC&limit=1&source=zzz` | 200; [] |
| enum orderflow tf | `/api/orderflow/footprint?asset=btc&tf=zzz` | 422; {"detail": [{"type": "int_parsing", "loc": ["query", "tf"], "msg": "Input should be a valid integer, unable to parse string as an integer", "input": "zzz"}]} |
| enum orderflow tf int | `/api/orderflow/footprint?asset=btc&tf=17&limit=2` | 422; {"detail": "tf must be one of [60, 300, 900, 1800, 3600, 7200] seconds, got 17"} |
| enum scanner chart tf | `/api/scanner/chart?instrument=BTC-11OCT26-83000-C&source=deribit&tf=zzz&limit=2&asset=btc` | 422; {"detail": [{"type": "string_pattern_mismatch", "loc": ["query", "tf"], "msg": "String should match pattern '^(5m/15m/30m/1h/4h/1d)$'", "input": "zzz", "ctx": {"pattern": "^(5m/15m/30m/1h/4h/1d)$"}}, {"type": "greater_than_equal", |
| enum ibit gex-map model | `/api/ibit/gex-map?model=zzz&window=all&bar=1d` | 422; {"detail": [{"type": "string_pattern_mismatch", "loc": ["query", "model"], "msg": "String should match pattern '^(flow/naive)$'", "input": "zzz", "ctx": {"pattern": "^(flow/naive)$"}}]} |
| enum ibit gex-map window | `/api/ibit/gex-map?model=flow&window=zzz&bar=1d` | 422; {"detail": [{"type": "string_pattern_mismatch", "loc": ["query", "window"], "msg": "String should match pattern '^(all/30/7)$'", "input": "zzz", "ctx": {"pattern": "^(all/30/7)$"}}]} |
| enum ibit gex-map bar | `/api/ibit/gex-map?model=flow&window=all&bar=zzz` | 422; {"detail": [{"type": "string_pattern_mismatch", "loc": ["query", "bar"], "msg": "String should match pattern '^(1d/30m)$'", "input": "zzz", "ctx": {"pattern": "^(1d/30m)$"}}]} |
| enum ibit spot tf | `/api/ibit/spot?tf=zzz` | 422; {"detail": [{"type": "string_pattern_mismatch", "loc": ["query", "tf"], "msg": "String should match pattern '^(1m/5m/15m/30m/1H/4H/1D)$'", "input": "zzz", "ctx": {"pattern": "^(1m/5m/15m/30m/1H/4H/1D)$"}}]} |
| enum ibit vrp bar | `/api/ibit/vrp?bar=zzz` | 422; {"detail": [{"type": "string_pattern_mismatch", "loc": ["query", "bar"], "msg": "String should match pattern '^(1d/1h)$'", "input": "zzz", "ctx": {"pattern": "^(1d/1h)$"}}]} |
| enum ibit dealer-gex model | `/api/ibit/dealer-gex?model=zzz&window=all` | 422; {"detail": [{"type": "string_pattern_mismatch", "loc": ["query", "model"], "msg": "String should match pattern '^(flow/naive)$'", "input": "zzz", "ctx": {"pattern": "^(flow/naive)$"}}]} |
| enum ibit spot-vol-skew bar | `/api/ibit/spot-vol-skew?bar=zzz` | 422; {"detail": [{"type": "string_pattern_mismatch", "loc": ["query", "bar"], "msg": "String should match pattern '^(1d/1h/30m/15m/5m)$'", "input": "zzz", "ctx": {"pattern": "^(1d/1h/30m/15m/5m)$"}}]} |
| enum market sources zzz | `/api/market/expiries?source=zzz` | 400; {"detail": "unknown source: 'zzz' (expected one of ['aevo', 'binance', 'bullish', 'bybit', 'callput', 'coincall', 'delta', 'deribit', 'derive', 'hypercall', 'okx', 'paradex', 'thalex', 'thetadata'])"} |
| enum asset zzz | `/api/market/expiries?source=deribit&asset=zzz` | 422; {"detail": "Unknown asset 'zzz'. Valid: ['avax', 'btc', 'eth', 'hype', 'lit', 'pump', 'sol', 'vvv', 'xaut', 'xrp', 'zec']"} |
| enum asset upper | `/api/market/expiries?source=deribit&asset=BTC` | 200; {source:str,expiries:[12 x str]} |
| enum source upper | `/api/market/expiries?source=DERIBIT&asset=btc` | 400; {"detail": "unknown source: 'DERIBIT' (expected one of ['aevo', 'binance', 'bullish', 'bybit', 'callput', 'coincall', 'delta', 'deribit', 'derive', 'hypercall', 'okx', 'paradex', 'thalex', 'thetadata'])"} |
| enum sources zzz | `/api/market/gex-profile?sources=zzz&asset=btc` | 400; {"detail": "unknown source: 'zzz' (expected one of ['aevo', 'binance', 'bullish', 'bybit', 'callput', 'coincall', 'delta', 'deribit', 'derive', 'hypercall', 'okx', 'paradex', 'thalex', 'thetadata'])"} |
