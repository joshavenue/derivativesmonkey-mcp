# Group E notes: calculators, strategy builders, quant/backtest (BTC)

Site: https://www.derivativesmonkey.com . Tested 2026-10-10 (BTC spot about 82,700-82,750 during session). All pages below were opened logged-out, no cookies/accounts touched. Anything marked "(inferred)" was not directly verified.

Quick map of what exists / is gated:

| URL | Status logged-out | One-line summary |
|---|---|---|
| /btc/calculator | Free, fully usable | Multi-leg BSM payoff/P&L calculator with live Deribit chain; the main tool |
| /btc/builder/break-even | Free | Call break-even and prob-ITM curves by strike for one expiry |
| /btc/builder/simulator | Free | Monte-Carlo (GBM) price path simulator; NOT position-aware |
| /btc/builder/basis | Free but looks broken | Option premium vs spot "basis" history, flat -100% |
| /btc/builder/roll-pnl | Free | Actually a Mark-IV heatmap (time vs spot) for one contract, not a roll P&L tool |
| /btc/builder/option-pnl | Free but mostly empty | Mark-price history of one contract; instrument picker appears stuck |
| /btc/builder/straddle | Free | Long-straddle payoff diagram for one strike+expiry |
| /btc/builder/combo-greeks | Free | Greeks vs spot curves for a 2+ leg combo (user-typed legs) |
| /btc/builder/combo-pnl | Free | Historical mark P&L of a combo of real listed contracts |
| /btc/strategy ("Monkey Strategy") | LOGIN REQUIRED | Strategy engine (docs say "TOOLS - PAID") |
| /btc/strategy/scan ("Monkey Scanner") | LOGIN REQUIRED | Strategy scanner |
| /btc/quant | Does not exist as a page: redirects to /btc/dashboard | Docs mention /quant ML signals; not reachable at this URL |
| /btc/backtest | Free, usable | Single-trade replay backtest with delta/theta/vega attribution |

Navigation: left sidebar groups. "STRATEGY" group = Monkey Strategy + Monkey Scanner; "QUANT" group contains only Backtest; "BUILDER" group holds the /btc/builder/* pages (and Calculator is linked from a group near the bottom). Global top bar: Search (Cmd-K), asset picker (BTC/ETH/HYPE), language, colour palette, live BTC price, "Trade Now" (affiliate link to app.derive.xyz/trade/options?ref=derivativesmonkey; I did not click it; it leads to a real trading venue).

Data feed: pages call same-origin endpoints such as /api/market/chain?source=deribit&expiry=YYYY-MM-DD, /api/market/chain-latest?source=derive, /api/market/expiries-all, /api/market/spot-history, /api/market/chain-history?instrument=...&source=deribit&hours=360, POST /api/positions/price (calculator), /api/backtest/meta, /api/backtest/spot-at, POST /api/backtest/run?asset=btc. One call, POST /auth/refresh, returns 401 when logged out (normal). /api/site-notice 404s (harmless).

---

## 1. /btc/calculator  ("Option Calculator", BSM P&L Calculator)

What it is: pick a strategy template (or build custom, up to 8 legs), pick real strikes/expiries from the live Deribit chain, and see payoff at expiry and "now", max loss/gain, break-even, Greeks and a scenario matrix. Pricing is Black-Scholes-Merton (BSM) using live mark IV of each leg. Header badge says DERIBIT (source).

Modes: two buttons "Basic" and "Advanced" (top-left). Basic = strategy picker + legs + payoff chart + "Estimated returns". Advanced adds delta-based strike input, Buy/Sell/Qty/Call/Put toggles per leg, Scenario Matrix and Greeks panels.

Inputs (Basic):
- Strategy search box ("Search strategies...") that opens a categorized list. Filters: DIRECTION (All/Bullish/Neutral/Bearish) and VOL BIAS (All/Long Vol/Short Vol/Term Structure/Directional). "+ Custom: build your own, add or remove legs freely, up to 8".
- Template list (25): Basic: Long Call, Long Put, Covered Call, Cash Secured Put, Naked Call, Naked Put. Spreads: Bull Call, Bear Call, Bull Put, Bear Put, Poor Man's Covered Call, Calendar, Ratio Back Spread. Advanced: Iron Condor, Butterfly, Iron Butterfly, Collar, Diagonal, Double Diagonal, Straddle, Strangle, Covered Strangle, Synthetic Put, Reverse Conversion. Each has a one-line description.
- Per leg: SIDE (BUY/SELL), TYPE (CALL/PUT), STRIKE & EXPIRY (a button like "20261013 . $82,500" that opens a chain picker: expiry tabs 11OCT26...24SEP27 across the top, then a table Strike / Mark (USD) / Bid / Ask / IV with Call and Put sides; click a strike row to set it), PREMIUM ($) (editable number; defaults to live mark in USD, you can override with your own fill price), AMOUNT with a COINS / $ toggle (size in BTC contracts or in dollars; 1 contract = 1 BTC), Qty.
- Advanced extras per leg: a delta box (placeholder 25) to choose a strike by delta (inferred).
- IV Change slider (-30% to +30%, step 5): shocks implied vol up/down across the whole position. Shows "IVR 515" next to it (IV rank; meaning of the 515 value unclear, looks odd).
- Time to Expiry slider ("Now" to "Exp . 3d", 4 notches for a 3-day trade): moves the valuation date forward to see P&L mid-trade.
- "DTE lines: on" toggle (button "Show or hide the intermediate days-to-expiry decay lines") shows 1d / 2d / Exp / Now curves on the chart.
- "Expand & zoom the payoff chart" button.

Outputs:
- Header chips: MAX LOSS, MAX GAIN, BREAKEVEN, RISK/REWARD (for multi-leg).
- "Total cost" (net debit/credit) and "Live PnL" (mark-to-market now vs entry).
- Payoff chart: P&L vs BTC price with lines for Now, 1d, 2d and Expiry, vertical markers for spot and B.E.
- "Estimated returns" box: Entry cost (debit/credit), Max risk, Max return, Max return on risk, Breakeven, plus a footer "Computed as of BTC @ <spot> (x% IV change); 1 contract = 1 BTC, P&L in USD".
- Advanced only: Scenario Matrix (rows = IV shift -20v, -10v, base, +10v, +20v vol points; columns = spot at -2s, -1s, -1/2 s, 0, +1/2 s, +1s, +2s where s is the 1-sigma move from current IV and remaining time; toggle "Now" vs "At Expiry"; each cell shows % return on max risk and USD). Greeks panels: Delta, Gamma, Theta (per calendar day), Vega (per 1% IV), each plotted vs spot with a position summary number.

Worked example 1 (Basic): default load = Long Call, BTC-13OCT26 82,500 call, spot 82,726. Premium $844.37 (= live mark). MAX LOSS 844, MAX GAIN unlimited, BREAKEVEN 83,344 (strike + premium). Live PnL -$844.36 at entry (shown nearly equal to max loss because bid/ask lag; essentially 0 vs mark slightly negative, inferred). 3 days left.

Worked example 2 (bull call spread): chose Bull Call Spread. Default legs: Buy 82,000 call @ $1,167.22, Sell 83,000 call @ $604.30, expiry 20261013. Net debit $562.91, max loss 563, max gain 437, breakeven 82,563, risk/reward 1:0.78, max return on risk 77.6%. Then I opened the short leg's strike picker and chose 84,000 (mark $273.18): net debit $894.04, max gain $1,105.96 (123.7% on risk), breakeven 82,894, R:R 1:1.24; position Greeks: delta 0.4167, gamma +0.000030, theta -14.67/day, vega +3.74 per vol point. Scenario matrix base row: -96% at -2s... +114% at +2s expiry-wise as displayed. Moving IV slider to +20% (URL got iv_shock=0.2) and time slider to step 2 changed the 1-sigma figures (1.3% / ~1,057) and the matrix.

Share/save/export:
- The URL fully encodes the trade: ?strategy=bull_call_spread&legs=L:C:82000:20261013:1167.218163:1:0.2429;S:C:84000:... (leg format: Long/Short : Call/Put : strike : expiry yyyymmdd : premium : qty : IV) and &iv_shock=0.2. So copying the URL shares the exact setup (the premium values are frozen into the link).
- "Save branded screenshot" button (opens a preview modal; image export) and a "Save" button (title "Save the current strategy as a named position") which opens a text box "Position name" with Confirm/Cancel. I cancelled; storage location unknown (probably per-browser or per-account, inferred). No CSV export seen.

Gating: free, no login needed for everything above (including Advanced).

Beginner notes:
- Payoff at expiry vs "today": expiry line is the hockey-stick; "now/1d/2d" curves are smoother because the options still have time value. Early in a trade you are on the "now" curve, not the expiry one.
- Break-even for a long call = strike + premium; for a debit spread = long strike + net debit.
- 1 contract = 1 BTC on Deribit; prices in the chain table: Mark column in USD, Bid/Ask in BTC (the picker shows bid/ask like 0.01 which are in BTC, Mark shown in USD).

Bugs/limits: strike picker "Bid/Ask" for very short-dated rows shows coarse 0.00-0.01 BTC increments, so use Mark. "IVR 515" label is unexplained. Weekend/near-expiry options have expiry dates 11OCT26 (tomorrow) so time-slider only has 3-4 notches.

---

## 2. /btc/builder/break-even  ("Break Even")

Purpose: Show, for one expiry, what price each call strike needs to reach to break even, and the Black-Scholes N(d2) probability that the call finishes in the money (a proxy for chance of profit at/above strike).

Inputs (top row, three fields): Expiry dropdown (2026-10-11 ... 2027-09-24), Spot (editable, prefilled with live ~82,736), IV (editable, decimal fraction, default 0.55 = 55%; NOT live, a flat IV).
Outputs: Left chart "CALL BREAK-EVEN BY STRIKE" (x = strike, y = break-even price, dashed spot line; hover shows strike and "Break-Even: $x"). Right chart "N(D2): PROBABILITY ITM (%)" (S-shaped curve from 100% at low strikes to 0% at high strikes).
Worked example: expiry 2026-10-11, IV 0.55: hover strike 87,000 -> Break-Even $87,708.85 (premium about $709). IV 0.25: same strike -> $87,322.11. Expiry 2026-10-30, IV 0.25: strike 91,000 -> break-even $92,910.02 (premium ~$1,910).
Caution: These premiums look too high compared with real chain marks (e.g. calculator shows 83,500 call at 1-3 days for a few hundred dollars at ~24% IV), so I suspect the tool uses a fixed/odd time-to-expiry or treats IV differently (inferred). Use the Calculator for real numbers; use this page only for the shape of the curves.
Concept: break-even = strike + call premium (price at expiry where a long call P&L is zero). N(d2) = model probability that spot finishes above the strike at expiry.
How to use: pick expiry, set spot/IV, hover the strikes you are considering, read break-even and probability.
Save/share/export: none. Gating: free.

---

## 3. /btc/builder/simulator  ("Simulator", titled "BTC Position Simulator")

Purpose: Geometric-Brownian-Motion Monte Carlo of BTC price (500 paths). Despite the title it does not take an option position; it just simulates spot.
Inputs: Spot (default 80000, hard-coded, NOT live), Drift (ann.) (default 0), IV (ann.) (default 0.6 = 60% volatility used as the path vol), Days (default 30).
Outputs: KPI cards: P(UP) (probability final price > entry), EXPECTED (mean terminal), 10TH PCT, 90TH PCT. Left chart: path fan (all paths coloured, median white line, 10/90 and 25/75 percentile bands, entry line). Right chart: terminal price histogram (blue below entry, red above) with entry marker.
Worked example: defaults (80000, drift 0, IV 0.6, 30d): P(UP) 45.4%, Expected $79,490, 10th pct $63,275, 90th pct $97,302. Then spot 82750, IV 0.4, 7d: P(UP) 50.6%, expected $82,890, 10th pct $77,516, 90th pct $88,275. Results change slightly on every run because paths are random (500 only), so P(UP) wanders by a few points.
Concept: with zero drift, GBM median is below the mean (log-normal skew), which is why P(UP) < 50% at high vol. Percentile bands are rough 1-sigma-ish ranges, not guarantees.
Limitations: no option legs, no P&L; prefilled spot is stale (80000). Save/export: none. Gating: free.

---

## 4. /btc/builder/basis  ("Basis")

Intended purpose (from subtitle): "Option premium vs spot, basis and annualized carry" for one contract. Contract dropdown (12 listed, one per expiry, e.g. BTC-11OCT26-83500-C, BTC-27NOV26-86000-C ...).
Outputs: two line charts, "RAW BASIS (%)" and "ANNUALIZED CARRY (%)", over the last ~2 weeks (data from /api/market/chain-history, 360 hours).
What I saw: both charts are a flat line at -100% (raw basis) and -500% (annualized) for the contract I tried, and empty for the default (BTC-11OCT26-83500-C, which only has ~3 days of history). Looks broken or at least meaningless (inferred: it compares an option price quoted in BTC to the USD spot, so the ratio is ~0).
Do not rely on it. For real futures/spot basis use the separate Futures > Basis / Term Structure pages (not in my scope) or /btc/basis (Basis Spread, cross-venue).
Save/export: none. Gating: free. Bug: flat -100%/-500%.

---

## 5. /btc/builder/roll-pnl  ("Roll Pnl")

Despite the name/title ("Roll P&L Calculator") it is NOT a roll calculator. Subtitle: "Implied vol vs spot level . IV response to price . <contract>".
Input: contract dropdown (same 12 contracts).
Output: one heatmap: x = time (about 10/07 to 10/10), y = BTC spot price level, colour = Mark IV % (blue about 16-22% low, red 30%+ high). Hover shows "$82,565 / Mark IV: 16.21%" (spot bucket and IV).
Use: see how a contract's IV responded to spot moves (e.g. in this contract IV was higher when spot was lower/earlier and compressed to ~16-20% as spot rose and time passed), i.e. an empirical "vol-spot correlation" for that strike.
There is no roll (close near, open far) P&L calculation anywhere on this page. For a calendar roll, build a Calendar Spread or Diagonal in /btc/calculator.
Save/export: none. Gating: free.

---

## 6. /btc/builder/option-pnl  ("Option Pnl")

Purpose: mark-price history chart for a single option ("CALL 73,000 . 11OCT26 . MARK PRICE HISTORY").
Inputs: expiry dropdown + instrument dropdown (every strike, C and P, for that expiry).
Observed: default instrument is the deepest ITM call and shows "No history available for this instrument". Changing expiry works (it also resets the instrument to the first listed, e.g. BTC-30OCT26-40000-C, again no history). I could not change the instrument selection (my attempts, both script-driven and keyboard, did not change the value or trigger a new data request), so I could not see a populated chart. This may be an automation artefact or a bug (inferred); a human clicking the native select may be fine. Data source when it works: /api/market/chain-history?instrument=BTC-...&source=deribit&hours=360.
Overlap: option-pnl = one contract's price history; combo-pnl = several contracts combined with P&L %; calculator = forward-looking payoff.
Save/export: none. Gating: free.

---

## 7. /btc/builder/straddle  ("Straddle")

Purpose: payoff diagram for a long straddle (buy call + buy put at same strike/expiry) with live prices.
Inputs: Expiry dropdown, Strike dropdown (all listed strikes for that expiry; default is the nearest ATM, e.g. 82,500).
Outputs: strip with STRIKE, CALL PREMIUM, PUT PREMIUM, TOTAL COST (and % of spot), BREAKEVEN RANGE (lower - upper, rounded to 0.1K); chart "PAYOFF AT EXPIRY: P&L vs SPOT ($)" with At Expiry line, "Now (approx)" curve and label "Max loss $-xxx".
Worked examples: 82,500 strike, expiry 2026-10-11 (1 day): call $381 + put $141 = $521 total (0.63% of spot); break-evens about $82.0K - $83.0K; max loss $521. 83,000 strike, expiry 2026-10-30 (about 20 days): call $2.5K + put $2.5K = $5.1K (6.10%); break-even range $77.9K - $88.1K; max loss $5,063.
Reading it: you profit if BTC finishes outside the break-even range at expiry; loss is greatest (the whole premium) if it finishes exactly at the strike. The break-even half-width is the market's implied move.
Compare: the Calculator's "Straddle" template does the same with Greeks, IV shocks and editable prices; this page is the quick view.
Save/export: none. Gating: free. Note: shows rounded range only (82.0K - 83.0K).

---

## 8. /btc/builder/combo-greeks  ("Combo Greeks")

Purpose: theoretical Greeks of a position vs BTC spot price, for a multi-leg combo you type in manually (no live chain; IV is an input).
Inputs: top "Spot" field (default 80000, not live) and "+ Add Leg". Each leg row: SIDE (long/short), OTYPE (Call/Put), STRIKE, IV (decimal, default 0.55), DTE (days, default 30), QTY, and a red X to delete. Default combo = long 80,000 call + long 80,000 put (a long straddle), 30 DTE, 55% IV.
Outputs: four line charts: DELTA, GAMMA, THETA (per day, USD), VEGA (per 1% IV), each versus spot (about 62K to 100K) with the current spot marked by a dashed vertical line.
Worked example: set spot 82,750; leg 1 long call 82,000, IV 0.5, 30 DTE; leg 2 short call 88,000, IV 0.5, 30 DTE (bull call spread). Delta curve peaks around +0.185 near 84K and falls off at both ends; gamma is positive below ~84K and negative above (short call gamma dominates); theta is negative near the lower strike and positive on the right; vega peaks (~+24) near the middle strikes. Interpretation: the spread behaves like a small long delta / long vega position until spot approaches the short strike.
Quirk: on first load with the default straddle the charts showed only the spot line (curves appeared flat/blank); after editing any input they rendered normally. Gating: free. Save/export: none.

---

## 9. /btc/builder/combo-pnl  ("Combo Pnl")

Purpose: replay the actual recorded mark prices of a set of real listed contracts to see how a combo's P&L evolved (not a forecast).
Inputs: "POSITION LEGS": each leg = contract dropdown (every listed instrument, e.g. BTC-13OCT26-82500-C), direction (Long/Short), quantity (default 1), X to delete; "+ Add Leg"; "Fetch PnL" button (nothing runs until you click it). Subtitle shows "N-LEG POSITION . HISTORICAL MARK PNL".
Outputs: "COMBINED PNL (%)" line (white) with each leg as a dotted line, x-axis in dates/time (about last 1.5 days: 10/9 - 10/10, data availability limits it even though 360 hours is requested), plus "LEG ATTRIBUTION" bar chart showing each leg's contribution over time.
Worked example: Long BTC-13OCT26-82500-C + Short BTC-13OCT26-84000-C (bull call spread), Fetch PnL: combined P&L finished at about +25% on the window, leg lines showing the long call driving gains and the short call offsetting.
Entry is presumably the first timestamp in the window (inferred); the percentage base is not labelled.
Gating: free. Save/export: none.

---

## 10. /btc/strategy  ("Monkey Strategy", page title "BTC Strategy Builder")  -- LOGIN REQUIRED

Opening it shows a modal "Sign in required: This section is only available to signed-in users" with SIGN IN and GO BACK. I did not sign in. From /btc/docs ("Strategy Engine", tag "TOOLS . PAID"): the BB1 strategy engine takes your bias (bullish/bearish/neutral/vol-long/vol-short), source venue and target expiry, then builds and scores candidate structures (spreads, straddles, condors) against the live surface and ranks them by risk-adjusted payoff. Ranking follows your view (bullish bias gives call spreads/risk reversals; vol-short gives iron condors/short strangles). Source/expiry can be pinned; HYPE falls back to Derive.

## 11. /btc/strategy/scan  ("Monkey Scanner", page title "BTC Strategy Scanner")  -- LOGIN REQUIRED

Same sign-in modal. Docs: "Strategy Scanner" sweeps the chain for the optimal structure for your inputs and returns top candidates with max profit, max loss, break-evens and probability of profit from current IV.

Difference (from docs, inferred): Strategy = guided engine where you state a view and get ranked structures; Scanner = the sweep that surfaces top candidates across the chain. Both appear to be part of the paid/signed-in tier.

---

## 12. /btc/quant

Navigating to /btc/quant redirects to /btc/dashboard (the Overview page). There is no Quant page in the sidebar: the "QUANT" group only holds "Backtest". The docs page describes a "Quant / ML" section at /quant (Isolation-Forest anomaly detection on the trade tape, XGBoost 1-hour direction probability, regime softmax, feature importance, calibration curve, flagged ML . ADVANCED), but it is not reachable at this URL for a logged-out BTC user (may have been removed or moved).

---

## 13. /btc/backtest  ("Strategy Backtest")

Purpose: "Replay a single options trade against real market data, P&L decomposed into delta / theta / vega". It re-prices a trade you would have entered at a past date using recorded Deribit/Derive candles and BSM greeks.

Layout: a left control column in three numbered steps plus an assumptions block, and a results column on the right.

Data & fill assumptions (apply to the whole run): venue toggle DERIBIT / DERIVE; fill model MARK FILL (enter/exit at mark price) vs BID/ASK FILL (pay the ask, hit the bid; more realistic); fees NO FEES vs REAL FEES (venue fee schedule).

1. What to trade: STRATEGY dropdown with 10 choices: Long Call, Long Put, Short Call, Short Put, Bull Call Spread, Bear Put Spread, Long Straddle, Long Strangle, Short Straddle, Short Strangle. EXPIRY filter chips ALL / WEEKLY / MONTHLY and an expiry dropdown (10JUL26 ... 24SEP27; list includes future expiries with no history yet). STRIKE dropdown(s) (one per leg), each annotated with days of candle data (e.g. "$62,500 . 4.0d data", "ATM" tag) and a note "Spot ~$63,391 at your Entry date (not live price)". RISK (USD) = premium to spend, which is also max loss (default $10,000), used to size contracts. A TRADE TIMELINE bar shows Entry -> days to expiry -> Exp.
2. Entry: ENTRY date picker + ENTRY (UTC) hour. Range limited to the data window ("Selectable 2026-07-06 -> 2026-07-09 (data start -> day before expiry)").
3. Exit rule: FIXED DATE (date + hour, with a "set to expiry" shortcut), DTE TARGET (exit when days-to-expiry <= N), % PROFIT (profit target as % of premium, e.g. +50%), STOP LOSS (as % of premium, capped at 100% for long positions, or in $).
RUN BACKTEST button.

Results: top card with EST. CONTRACTS, DEBIT/CONTRACT, BREAKEVEN (or MAX LOSS), ENTRY SPOT; then P&L, RETURN (% PREMIUM PAID), ENTRY/EXIT SPOT, ENTRY IV, EXIT REASON (at expiry / end of data / profit target...), ENTRY DTE / EXIT DTE; "Data quality" notes (expandable); with REAL FEES: "Fees paid" and "Net P&L after fees"; ENTRY GREEKS (BSM): delta, gamma, theta/day, vega per 1% for the whole position; charts: SPOT PRICE (entry/exit markers), P&L EQUITY CURVE (USD, with LOG toggle), GREEK ATTRIBUTION (cumulative USD P&L split into DELTA, THETA, VEGA, GAMMA and UNEXPLAINED).

Worked example A (defaults): Deribit, mark fill, no fees; Long Call, 10JUL26 weekly, strike $62,500, $10,000 risk, entry 2026-07-06 8:00 UTC, exit at expiry 2026-07-10 8:00 UTC. Result: 7.426 contracts at $1,346.55 each, breakeven $63,846.55, entry spot $63,391, exit spot $64,215, entry IV 38.1%, P&L +$2,735.07 = +27.4% of premium. Entry greeks: delta 4.797, gamma 0.001091, theta -$873.93/day, vega +$183.29 per 1% IV.
Worked example B: Long Straddle on 9OCT26 expiry, call and put at 76,000, entry 2026-09-17 8:00 UTC (spot $76,612), exit fixed date 2026-09-18 8:00 UTC. Mark/no fees: 2.035 contracts at $4,913.13, P&L -$51.50 (-0.5%), entry IV 32.6%, delta 0.227, theta -$224.59/day, vega +$302.08. With REAL FEES: fees $186.37, net P&L -$237.39 (-2.4%); the sizing also shrank (2.016 contracts) because fees come out of the $10,000 budget. A data-quality note said "Truncated hold: data ended after 20.7h (requested 0.9d). Results do not reflect the full trade window." and EXIT REASON "end of data".
Reading: the straddle roughly broke even in 1 day because BTC drifted from 76.6K to 77.4K (smallish move) and theta (-$225/day) offset the gain.

Assumptions/limits a beginner must know:
- History is short: candle data only starts around 2026-07-06 and each contract only has the days since it first traded (3-5 days for weeklies, up to ~22 days for longer ones); the usable entry date range is therefore days, not years. It is a "replay one trade" tool, not a multi-year strategy backtester or a statistical test.
- Spot shown for strikes is spot at your entry date, not the live price.
- Mark fill ignores bid-ask spread; Bid/Ask fill and Real fees are more realistic. Fees reduce position size for a given USD budget.
- Greeks are BSM-model estimates; "unexplained" bucket captures higher-order/IV-skew/model error.
- Only a single position of the listed strategy types; no rolling, no portfolio.
Bugs/limits observed: (1) BID/ASK FILL returned "backtest/run 500: Internal Server Error" on the straddle case (twice); Mark fill worked. (2) A run with exit rule "DTE target <= 3d" on the same straddle stayed on "Simulating..." for 40+ seconds (no result) in my session. (3) Default expiry (10JUL26) is old data from July, easily confusing next to the live 82K BTC price.
Save/export: no save or share link seen. Gating: free with no login (Deribit and Derive both selectable).

---

## Differences between overlapping tools

- Calculator vs Straddle page vs Break-Even page: Calculator = general multi-leg, live prices, BSM scenario matrix, Greeks, IV/time sliders, shareable URL. Straddle page = one preset (call+put same strike) quick view. Break-even page = per-strike break-even/probability curves with a flat IV you type in, no premiums shown directly.
- Calculator vs Combo Greeks: Calculator prices from the live chain and shows a handful of Greeks numbers; Combo Greeks lets you type any IV/DTE (not live) and plots Greeks as curves across spot.
- Calculator vs Option P&L vs Combo P&L: Calculator is forward-looking (what-if payoff). Option P&L (single contract) and Combo P&L (several contracts) are backward-looking recorded mark-price histories; Combo P&L adds leg attribution.
- Combo P&L vs Backtest: Combo P&L = last ~1-2 days of actual marks, no entry/exit rules. Backtest = pick entry/exit rules, fill model, fees, risk size, with Greek attribution but over short windows.
- Simulator vs everything else: spot-only Monte Carlo, no options.
- Strategy vs Scanner: gated; per docs, Strategy = view-driven engine, Scanner = chain sweep (inferred distinction).
- Basis/Roll P&L are mislabeled relative to their content (see above).

## Plan-a-trade workflow using these tools

1. Form a view first on the Overview/Vol/Skew/IV-percentile pages (outside this group): direction, and whether IV is cheap or rich (cheap -> buy options; rich -> prefer spreads/selling).
2. Pick a structure. Use /btc/strategy or /strategy/scan if you have an account; otherwise choose a template in /btc/calculator (e.g. bull call spread for a moderately bullish view, straddle for a "big move either way" view).
3. In /btc/calculator Basic mode: set expiry/strikes from the live chain picker, size in BTC or USD. Note max loss, max gain, break-even and risk/reward. Overwrite the premium with your realistic fill (mid or ask) if you plan to pay the ask.
4. Switch to Advanced: drag the Time slider to your planned exit date and the IV slider (+/-10-20%) to see how a vol crush or spike changes P&L; read the Scenario Matrix across -2s...+2s; check net delta, theta per day (cost of waiting) and vega.
5. Cross-check break-even vs the market-implied move with /btc/builder/straddle (break-even range = implied move) and probabilities with /btc/builder/break-even (with the caveat above).
6. Stress test: /btc/builder/combo-greeks to see how delta/gamma change if BTC runs; /btc/builder/simulator for a rough spread of price outcomes over your holding period.
7. Sanity-check historically: /btc/backtest a similar structure on a recent expiry (mark vs bid/ask, with real fees) to see typical theta/delta behavior; use /btc/builder/combo-pnl to see how your exact legs have moved over the last day or two.
8. Copy the calculator URL to save/share the plan (or use the Save button / branded screenshot). Execute on your own venue (the "Trade Now" button goes to Derive; nothing here places orders). Manage by the exit rules you set (target %, stop %, DTE).
