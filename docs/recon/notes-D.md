# Group D notes: Greeks / dealer positioning + futures (BTC) - derivativesmonkey.com

Observed 2026-10-10 (Sat), BTC spot about $82.7k-83.3k. Browsed logged-out (no account). All pages in scope loaded without login. A pane/visibility issue meant I could not take screenshots (browser pane hidden), so chart shapes are read from DOM text, not visuals. Anything marked (inferred) is my reading, not stated on the site.

Page text containing instructions to AI agents: none seen on these pages.

## 0. Site-wide context useful for this group

- React SPA. Left sidebar groups (BTC): Dashboard (Overview /btc/dashboard, Custom, Strike Insight); TradFi (IBIT pages); Volatility (Term, Surfaces, Vol Metrics, Skew, IV Percentile, VRP, Vol Index MBVI, Vol Regime); **Greeks** (Levels /btc/levels, Dealer Positioning /btc/greeks, Greek Exposure /btc/greek-exposure, Heatmaps /btc/heatmaps, Exposure Heatmap /btc/thermography, Tail Strike /btc/tail-strike); Flow (Tape, Order Flow, Volume Flow, Open Interest, Scanner); Block RFQ; **Multi Exchange Stats** (Divergence, Lead-Lag, **Basis Spread = /btc/basis**); Premium (Premium Matrix); **Futures** (Basis /btc/futures/basis, Term Structure, Funding Rates, Basis History /btc/futures/history); Strategy; Backtest; Calculator; Builder > **Arb Guide**; Stats; Docs. /btc/gex-profile and /btc/futures/oi-profile are NOT in the sidebar (reachable by URL; the dashboard "FULL GEX" link goes to gex-profile, inferred).
- Top bar: Search (Cmd-K), asset selector (BTC/ETH/HYPE), language, colour palette, live BTC price, "Trade Now" referral link to Derive (app.derive.xyz ... ref=derivativesmonkey). "Powered by Derive" badge.
- Data sources: up to 12 options venues (Derive, Deribit, Binance, Bybit, OKX, Thalex, Paradex, Aevo, Delta, Bullish, CallPut, Hypercall); futures pages use Binance, Bybit, Deribit, Kraken, OKX, Thalex. Data via same-origin REST `/api/market/...` (market-summary, term-structure, chain-latest, expiries-all, dealer-positioning?expiry=&signing=flow|naive, expiry-exposure, implied-prob, gex-profile?view=corrected, gamma-flip, gex-strike-heatmap?window_hours=&price_band=, spot-candles?tf=30m&source=bybit, sources-all) plus a WebSocket client. `POST /auth/refresh` returns 401 when logged out (harmless). Plotly (3D surface) and lightweight-charts (candles) are the charting libs.
- Gating: everything below worked with no login. The docs say "Sign up for full access to the GEX Profile, Arb Scanner, Divergence, Strategy Engine" and tag Strategy Engine as PAID, but I saw no paywall on gex-profile, greeks, greek-exposure or futures pages while logged out (the docs claim may be outdated; unverified whether limits kick in after use).
- Free-text docs (/btc/docs) define: positive GEX = dealers long gamma = stabilising/pinning; negative GEX = dealers short gamma = trend-amplifying; Call Wall = strike with largest positive GEX (ceiling); Put Wall = strike with largest negative GEX (floor); Gamma Flip = price where net GEX crosses zero (above = stabilised, below = amplified). Formula given: GEX = sum(gamma x OI x spot^2 x 0.01) per strike, sign-flipped for dealer. Warns GEX is directional not predictive and resets at expiry.

## 1. Beginner concepts (plain English)

- **Delta**: option price change per $1 spot move (call 0.5 = gains $0.50). Net dealer delta = how much spot dealers are effectively long/short before hedging.
- **Gamma**: how fast delta changes as price moves. Biggest near the strike and near expiry. If dealers are *long gamma* they sell rallies/buy dips (damps moves); *short gamma* they buy rallies/sell dips (amplifies moves).
- **GEX** (gamma exposure): dollar size of the hedging dealers must do per 1% spot move, summed over strikes. Site shows "USD / 1% spot move".
- **Vega**: price change per 1 vol point of implied vol. **VEX** = vega x OI.
- **Vanna**: how delta changes when IV changes. If vanna is big, an IV drop/spike forces dealers to buy/sell spot ("vol shocks become spot flows").
- **Charm**: how delta decays as time passes (delta drift per day). Forces dealers to rebalance every day even if price is flat; matters most into expiry.
- **Theta**: daily time decay. **Higher-order** (speed, zomma, color): second-order sensitivities; the Greeks page says these "now live in the Higher Greeks section" but I could not find a working route (see section 5).
- **Dealer sign convention**: GEX/DEX/VEX are shown "dealer sign". Site's "naive" convention is "call-plus / put-minus" (calls count positive, puts negative for GEX; i.e., assumes dealers are long calls/short puts relative to customers, (inferred) the standard simplification). "Flow signed" instead infers dealer side from taker trade direction (if the taker bought, the dealer sold) where flow is available.
- **Call wall / put wall / gamma flip / max pain**: see section 0; max pain = strike where option buyers lose most at expiry (a pin-magnet idea).
- **Basis**: futures price minus spot (index). Positive = contango (futures above spot). Quoted as % premium and **APR** (annualised: premium scaled by 365/days-to-expiry). Roughly the "cash-and-carry" return for being long spot / short future.
- **Funding rate**: periodic payment between longs and shorts on perpetual swaps that keeps perp near spot. Positive = longs pay shorts (bullish crowding); negative = shorts pay longs. Quoted per 8h and annualised.
- **Contango / backwardation**: curve sloping up (future > spot, normal) vs down (future < spot, stress/bearish or high-demand-for-spot).
- **Vol point (vp)**: 1% of IV (60% -> 61% = 1 vp). Used in arb guide.

## 2. Page-by-page

### 2.1 /btc/greeks  ("Dealer Positioning", sidebar Greeks > Dealer Positioning)
- **Purpose**: per-strike dealer exposure (GEX, VEX, DEX) for one chosen expiry, plus supporting cross-expiry and dealer-regime panels. Title "GREEKS / DEALER POSITIONING: Dealer positioning per strike - Dealer GEX, VEX, and DEX per strike, summed across all sources."
- **Top panel**: "Dealer Greek surface" 3D Plotly surface (Gamma / Vanna / Charm tabs), "analytical, OI-weighted"; colour bar teal = positive, red = negative; seems to be strike x time(or expiry) x exposure (inferred). Rotatable.
- **Controls**:
  - SOURCE: multi-select dropdown (All sources; checkboxes for Derive, Deribit, Binance, Bybit, OKX, ... up to 12). Changes which venues' OI is summed.
  - EXPIRY: dropdown of live expiries (default was the 3rd expiry, 13OCT26; selecting writes `?expiry=2026-10-16` in the URL so it is deep-linkable).
  - FLOW SIGNED vs NAIVE toggle (`?signing=flow|naive`). Flow signed note: "Dealer side confirmed by taker flow on 51% of open interest at 76% mean confidence. Remaining strikes use the naive convention." Naive text: "Dealer sign from the call-plus / put-minus convention. No taker flow applied."
- **Panels** (scrolling down):
  1. *Greek exposure per strike* for the selected expiry: three stacked bar charts GEX (gamma x OI x dealer sign), VEX (vega x OI), DEX (delta x OI), by strike (e.g. 73k..92k). Labels like "flow - 100%" per strike = how much of that strike's sign was confirmed by taker flow. Legend: dealer long/positive vs dealer short/negative. Clicking/hovering a strike shows a card (e.g. "Strike 87.5k GEX: Net -39.8K, Call OI 12.0, Put OI 0.070, Signing flow 100%, Flow flipped sign: yes").
  2. *Dealer delta (DEX) by expiry* table: Expiry, DTE, Call OI, Put OI, Dealer DEX, Net delta, Signing (flow %/naive). Example: 30OCT26 19d call OI 115.9K / put 76.7K, dealer DEX +1.3B, signing flow 44%; 16OCT26 -139.0M; 25DEC26 +1.8B. Long-dated expiries have low flow coverage (20-40%) so are mostly "naive".
  3. *Expiry Exposure*: bars by expiry, switchable GEX / DEX / VEX / Charm / Theta / OI, calls vs puts vs net, in $.
  4. *Cumulative GEX*: cumulative dealer gamma by strike, with spot ($83,089) and GEX Flip ($82,732) markers.
  5. *GEX profile* mini-panel with NAIVE / PROPER toggle (appeared stuck on "LOADING..." in my session = possible empty/slow state).
  6. *Max Pain by Expiry*: table of max-pain strike per expiry per venue (Derive, Deribit, Binance, Bybit, OKX, Thalex, Paradex, Aevo, Delta, Bullish, Callput, Hypercall) with spot column; amber = within 1% of spot. Many "n/a" cells.
  7. *Implied Probability*: risk-neutral ITM probability by strike, Black-Scholes N(d2) per expiry (selectable): Call prob, Put prob, break-even for calls/puts, call OI, put OI. Example 10Oct snapshot (expiry 2026-10-11): 83k strike call ITM 48.6%/put 51.4%; 90k call 13.6%.
- **How to read**: pick the expiry you trade (or the nearest big-OI one); find strikes with the biggest positive GEX bars (call-wall-like, price "sticks"/stalls) and big negative bars (accelerators/put-wall-like). Compare DEX by expiry to see whether dealers are net long/short delta (hedge flow direction as price moves). Use the flip-signed toggle to see how sensitive the picture is to the dealer-side assumption: if Flow signed and Naive disagree a lot at a strike, treat that level as low confidence.
- **Assumptions**: dealer sign either inferred from taker flow or call-plus/put-minus; OI-weighted analytical greeks (not live exchange greeks). Moved notice: "Higher-Order Greeks (speed, zomma, color) now live in the Higher Greeks section. The Tail Risk wing panel moved to Tail Strike."
- **Sample values**: spot $83,089, flip $82,732 (flip within 0.4% of spot -> near-flip regime).
- **Gating**: free, no login.

### 2.2 /btc/gex-profile  (not in sidebar; "GEX profile" full page)
- **Purpose**: price chart overlaid with a time-evolving gamma heatmap and key levels (Call Wall, Put Wall, GEX Flip, Spot). Description: "Net dealer gamma by strike... the strike plot marks Call Wall, Put Wall, Spot, and GEX Flip against the current snapshot; the heatmap shows how that gamma surface evolved over the selected window on the live price axis."
- **Controls**: TIME FRAME (candles) 5m/15m/30m/1H/4H/1D; EXPIRY dropdown (All expiries or any single date); Source dropdown (All sources); GAMMA RANGE (history window) 2h/6h/12h/24h/3D/7D/14D/Max; BAND (price band around spot shown) +-2% / +-5% / +-10%; COLOR: Absolute (single colour scale across all strikes) vs Relative (stretch each strike's colour over its own magnitude range).
- **Shows**: BTC candles (30m default, from Bybit via /api/market/spot-candles) with a gamma-surface heatmap behind them and labelled horizontal lines. Observed values (All expiries): GEX Flip 82,751, Spot 82,826, Call Wall 90,000, Put Wall 95,000 (note put wall above spot and above call wall: because "put wall" = largest negative-GEX strike and long-dated puts dominate; it can look nonsensical, so check expiry-filtered view). Filtering to 2026-10-16 gave Put Wall 80,000, Call Wall 85,000, GEX Flip unchanged 82,751 (so flip appears to be a whole-book value, (inferred)).
- **Empty states / quirks**: at defaults (24h range) the chart area showed "NO GAMMA DATA FOR THIS WINDOW"; switching range to 7D rendered; choosing a single expiry again showed "NO GAMMA DATA FOR THIS WINDOW" (heatmap history probably only exists for all-expiry aggregate, (inferred)). The subtitle text didn't update with the range immediately ("24h" while 7D selected).
- **How to use**: (1) set Expiry = All, Band = +-5%, Range 24h-3D; (2) see where spot is vs Flip: above flip = dealers long gamma (fade extremes, expect compression); below flip = short gamma (moves extend, bigger intraday ranges); (3) treat call wall as likely resistance/stall and put wall as likely support; (4) watch the heatmap: bright gamma bands that persist = durable magnets; bands that fade = OI rolled/expired; (5) switch to nearest expiry to see 0-2 DTE pin levels for the day.
- **Gating**: free logged-out. Docs claim sign-up for "full access".

### 2.3 /btc/greek-exposure  ("Greek Exposure")
- **Purpose**: ladder/heatmap-style view of a single dealer Greek (Gamma, Charm, Vanna) per strike in dollars, with regime summary and neutral levels.
- **Controls**: metric tabs GAMMA / CHARM / VANNA; expiry-bucket filters ALL / 0DTE / 7D / EOW / EOM (0DTE label shows the actual nearest expiry, e.g. "0DTE: Sun 11 Oct", 37 instruments vs 698 for ALL); source badge "DERIBIT" (fixed, a status badge, not a switch that I could operate) with data-age tag ("stale - 9m" / "stale - 4m"); Appearance and Log Scale buttons; "reset view (double-click heatmap)".
- **Header cards (units)**: Gamma "USD / 1% spot move"; Charm "USD / day delta decay"; Vanna "USD / vol pt delta shift". Cards: NET EXPOSURE (USD) (e.g. +28.7B, "Dealers LONG gamma (stabilising)"); NET EXPOSURE (BTC) (344,337.68 BTC equivalent); PEAK EXPOSURE (+435.79M).
- **Per-strike table** (strike, % from spot, call OI, put OI, net OI, exposure bar): e.g. $90,000 (+8.0%) call OI 25,191, put 1,343, gamma +56.5M (biggest positive = the dominant call wall); $80,000 (-4.0%) 13,013/10,556, gamma -6.3M; $83,500 net -6.79M.
- **Right-hand panel**: BTC/USD price + source + time; DEALER REGIME chips ("LONG G", "DELTA-DECAY up", "VANNA up"); KEY LEVELS (t = 0): **G-FLIP** $79,947 (-4.05%, BELOW spot), **C-NEUTRAL** (charm-neutral price) $95,673 (+14.83%), **V-NEUTRAL** (vanna-neutral price) $97,414 (+16.92%). For 0DTE: G-flip $82,563, C-neutral $80,619, V-neutral $83,245.
- **Observed**: charm tab: net -31.1K USD/day ("delta-decay selling pressure"), peak +885; vanna 0DTE net +134.6K ("vol-hedge buying").
- **Assumption**: Deribit-only OI/greeks and the dealer sign convention (not shown here, (inferred) call-plus/put-minus naive). The G-flip here ($79.9k all-expiries on Deribit) differs from the cross-venue flip on /btc/greeks and /btc/gex-profile ($82.7k): different data set/model.
- **How to use**: Choose bucket matching your horizon (0DTE for intraday, EOW weekly). Gamma tab: tall green bars above spot = where hedging dampens rallies; red zones = acceleration risk. Charm tab: if net negative ("selling pressure") dealers must sell delta as time passes (drift pressure into expiry). Vanna tab: positive vanna = falling IV forces dealers to buy spot (supportive) and rising IV forces selling (inferred sign logic, standard). Neutral levels = prices where that Greek's net exposure flips sign; same logic as gamma flip.
- **Quirks**: timestamps may freeze ("stale") when tab is background/hidden.
- **Gating**: free.

### 2.4 /btc/greek-exposure/higher-greeks
- **Result: does not exist as a route.** Navigating (full load and SPA push) immediately redirects to /btc/dashboard. The Greeks page text says higher-order Greeks (speed, zomma, color) "now live in the Higher Greeks section", but I found no such page in the sidebar; also tried /btc/higher-greeks and /btc/greeks/higher, all redirect to dashboard. Treat as **dead/removed/unlaunched** (maybe behind a feature flag or only for a logged-in tier, (inferred)). Unknown routes silently fall back to /btc/dashboard.

### 2.5 /btc/delta-hedge
- **Result: does not exist as a route**: redirects to /btc/dashboard (same fallback). Not linked in sidebar. (Closest functionality: DEX-by-expiry table on /btc/greeks, step 06 "delta-hedge the net position" in the Arb Guide, and the Calculator.)

### 2.6 /btc/basis  ("Basis Spread", sidebar Multi Exchange Stats > Basis Spread)
- **Purpose**: cross-exchange *spot index* spread plus per-strike options mark divergence. Intro: "Cross-exchange spot index spread (top) and per-strike USD-equivalent mark divergence (bottom). The spot spread shows how each venue prices BTC underlying; a chronic offset here explains systematic IV disagreement on the same strike. Per-strike panels need >= 2 sources and an active expiry."
- **Shows**:
  - SPOT INDEX SPREAD (last 60m, 1-minute buckets): table by venue of spot USD, offset vs median in bps, age. Example: Derive $82,740 (-0.8 bps), Deribit $82,743, Binance $82,816 (+8.3 bps), Bybit $82,812, OKX $82,747 (median), Thalex, Paradex, Aevo, Delta $82,817, Bullish $82,878 (+15.9 bps), Hypercall; MEDIAN $82,747 with 16.8 bps range. Plus a line chart of spot price history per venue.
  - Per-strike panels (choose EXPIRY): FRESHNESS strip (which venue snapshot is freshest and lag, e.g. Derive freshest, Bybit +53s lag; Thalex/Delta/Callput/Hypercall "no samples"); IV DISAGREEMENT chart (call/put delta-IV by strike in vol points); BASIS SPREAD (USD) chart (call/put USD mark divergence by strike; range about -$120..+$120).
- **How to read/use**: USDT-settled venues (Binance/Bybit) trade at a persistent premium (+8 bps) to USD venues (Derive/Deribit): structural offset. Wide spread = one venue under stress/dislocated; before comparing option IVs across venues, mentally adjust for this offset or you will see "fake" arbitrage. Use freshness lag to ignore stale venues.
- **Quirks**: the freshness labels said "59m/1h" for the per-strike options data while spot ages were seconds; options snapshots are older than spot feeds. Default expiry shown 2026-10-13.
- **Gating**: free.

### 2.7 /btc/futures/basis  ("Basis: Current Snapshot")
- **Purpose**: live table of every BTC futures/perp contract's premium vs index across six futures venues. "Deribit dated futures and perpetual swap vs index. Premium % and annualized APR per instrument." (Subtitle says Deribit but the table includes Binance/Bybit/OKX/Thalex/Kraken instruments.)
- **Columns**: APR, % Premium, $ Premium, 24h Change, Mark, 24h Volume, Open Interest, Instrument. Sorted by expiry (perp first).
- **Filters**: Source dropdown (All sources, Binance, Bybit, Deribit, Kraken, OKX, Thalex); Currency dropdown (All currencies, BTC [coin-margined], USD, USDC, USDT, plus an odd item "U").
- **Observed values**: BTC-PERPETUAL +6.00% APR / +0.03% premium / $24 / mark $82,766 / vol 1.21b / OI 832.7m; BTC-30OCT26 +5.91% APR / +0.32% / $266; BTC-25DEC26 +5.27% APR / +1.10%; BTC-26MAR27 +5.25% APR / +2.40%; BTC-24SEP27 +5.42% APR / +5.18%. So curve in mild contango, ~5-6% annualised across the curve. Instrument naming (inferred): `BTC-xxMMMyy` = Deribit coin-margined, `BTC_USDC-` = Deribit USDC-margined, `BTCUSDT-`/`BTCUSDT_` = Bybit/Binance, `BTC-USD-YYMMDD` = OKX, `FF_XBTUSD_` = Kraken dated futures; `FI_XBTUSD_` rows show 0.00% (Kraken inverse placeholder/bad data).
- **How to use**: APR = what a cash-and-carry trader (long spot, short future) would earn annualised; compare to risk-free/stablecoin yield. APR well above ~10% = leveraged-long demand; near zero or negative (backwardation) = bearish/stress. Compare same-expiry rows across venues to spot unusual premiums.
- **Gating**: free.

### 2.8 Difference: /btc/basis vs /btc/futures/basis
- **/btc/basis** (Basis Spread): *between venues* - how each exchange's spot/index price differs (bps), and how option marks/IV for the same strike differ across venues. It is an options-arbitrage/data-quality tool, lives under "Multi Exchange Stats", and uses options venues (12).
- **/btc/futures/basis**: *futures vs spot index* - premium/APR of each dated future and perp, for carry trades and market sentiment. Uses futures venues (Binance, Bybit, Deribit, Kraken, OKX, Thalex).

### 2.9 /btc/futures/term-structure
- **Purpose**: futures curve visual: premium % or annualised APR versus tenor, across venues.
- **Controls**: metric toggle ANNUALIZED APR / PREMIUM %; tenor filter ALL TENORS vs END OF MONTH (toggle; when I clicked, perps were also listed); SOURCES dropdown (All sources); TENORS dropdown (All expiries); venue chips: Deribit (hover for Coin-M / USDC-M), Thalex, Bybit, OKX, Binance. Chart supports scroll/drag sliders to zoom X and Y independently.
- **Table** (INSTRUMENTS): Tenor, Instrument, Kind (FUTURE, with COIN-M / USDC-M labels), Mark, DTE, Premium %, APR %. Example: Oct30 (20d) 0.32% / 5.91% APR; Nov27 (48d) 0.73% / 5.60%; Dec25 (76d) 1.10% / 5.27%; Mar26 (167d) 2.40% / 5.25%; Jun25 (258d) 3.83% / 5.41%; Sep24 (349d) 5.18% / 5.42%. Flat ~5-5.5% APR curve = calm contango.
- **How to use**: upward sloping = contango (normal; carry-trade yield = APR). Inverted (front APR > back, or negative) = stress/short-term leverage demand or panic. Steepening APR at the front often signals leverage building. Venue dispersion (Bybit/OKX APR lower ~4.8-5% vs Deribit ~5.9% for Oct30) shows where the cheapest/dearest carry is.
- **Gating**: free.

### 2.10 /btc/futures/funding  ("Funding Rates: Perpetual Swaps")
- **Purpose**: current and historical perpetual funding per exchange.
- **Current rates cards**: Deribit 8h +0.0055% / annualised +6.00% / mark $82,766; Binance -0.0033% / -3.63% / next funding 5h 18m; Bybit -0.0036% / -3.97% / next 5h 18m; OKX +0.0049% / +5.32% / next 13h 18m (looks odd for an 8h cycle: possible bug, or OKX shows a different cadence, (inferred)).
- **History chart**: range dropdown 30D / 60D / 90D; unit dropdown 8H RATE / ANNUALIZED; source dropdown ALL SOURCES / BINANCE / BYBIT / OKX / DERIBIT; chart axis "Rate / 8h %". Default showed Deribit 30D (last +0.0049%, range -0.0105% to +0.0315%).
- **How to read**: baseline funding is +0.01% per 8h (~11% APR). Persistently higher (>+0.03% / 8h) = crowded longs (squeeze/long-liquidation risk); negative = crowded shorts or hedging demand (short-squeeze fuel). Funding here is roughly flat to negative on Binance/Bybit and mildly positive on Deribit/OKX = neutral, no crowding. Divergence between venues (Deribit +6% vs Binance -3.6% APR) is itself a signal/arb input.
- **Gating**: free.

### 2.11 /btc/futures/history  ("Basis History")
- **Purpose**: time series of basis for each futures contract, to see how carry has trended.
- **Controls**: window 7D / 30D / 90D / 180D / 240D; metric APR % / BASIS %; "BTC SPOT" overlay toggle; contract selector: MONTHLIES / ALL / CLEAR; exchange rail with counts of available contracts (Deribit 9/21, Binance 2/2, Bybit 6/8, OKX 6/6, Thalex 5/9, Kraken 5/6); per-exchange per-expiry checkboxes (ALL / MONTHLIES / NONE); "PLOTTED LINES" chips with x to remove. Banner: "33 of 52 plotted... 33 lines on one shared axis... past ~20 lines the curves get hard to separate by eye. Use the exchange rail, or Monthlies, to narrow it down."
- **How to use**: pick one expiry (e.g. Dec25) across venues to see convergence; watch APR spikes (leverage booms) and collapses to zero/negative (de-risking). Basis converging to zero at expiry is expected (pull to par).
- **Gating**: free. Default expiry labels like "Oct30", "Jun25", "Sep24", "Mar26" omit year.

### 2.12 /btc/futures/oi-profile  ("OI by Strike: Futures Market Value")
- **Purpose**: despite the "Futures" nav label and title, this is the **options** OI by strike (Calls/Puts, P/C), valued three ways. (inferred from the legend: Calls, Puts, Calls MV, Puts MV, Total Intrinsic Value, P/C ratio.)
- **Controls**: Source (All sources), Expiry dropdown (ALL expiries or each of 12), Call/Put toggle C / C+P / P, and measure toggle: Contract (OI in contracts) / Intrinsic (OI x intrinsic value, $) / Market Value (OI x mark price, $) / Avg Premium (avg premium per contract, $).
- **Summary line**: Calls: 292.4K contracts (Notional $24.49b, Market $962.92m); Puts: 210.3K (Notional $17.62b, Market $280.42m); P/C Ratio 0.72.
- **How to use**: biggest bars = strikes with most capital; intrinsic view shows where option holders are already in the money (settlement/hedge pressure); market-value view shows where premium dollars sit. Combine with GEX walls.
- **Quirks**: page title says "Futures Market Value" though data is options; button states lag one click in my test.
- **Gating**: free.

### 2.13 /btc/arb-guide  ("How to trade IV arbitrage")
- **Purpose**: tutorial + live feed for cross-exchange implied-vol arbitrage (buy option on the venue with lower IV, sell the identical contract where IV is higher, delta-hedge). "6 exchanges covered - fee-adjusted math built in - 7-step execution flow" (header; the calculator lists 8 venues).
- **Sections**: 00 Live Arb Opportunities table (refreshes every 30s; Age, Expiry, Direction BUY->SELL, Spread - Fee, Net); clicking a row shows a plain-English description and a spread-history chart (e.g. "Buy the option on delta (lower IV). Sell on thalex... Raw spread 1.54 vp. After round-trip taker fees 0.48 vp, net 1.05 vp. At ~$900 vega/contract = about $948 per contract before slippage."). Observed live rows: DELTA->THALEX 1.05 vp net (30OCT26), DERIVE->THALEX +1.08 vp (25JUN27), DERIVE->BINANCE +0.50 vp, OKX->DERIBIT +0.50-0.60 vp. 01 Reading the Scanner (hover-explained example row; dated 2026-06-27 so it is static sample data; defines vol point, vega, net edge). 02 live calculator (select Exchange A/B, ATM IV A/B, vega USD/contract, BTC spot -> IV spread, fee cost, net edge, viable/not; default sample 62% vs 68% -> +5.95 vp, about $4,923/contract). Fee formula given: fee_vp = (fee_rate x spot) / vega_usd; scanner fires when net_edge_vp >= 0.5. 03 Step-by-step: spot signal; verify freshness; open both exchanges; place buy leg (cheaper); place sell leg (expensive); delta-hedge net; monitor/close. 04 Exchange instructions tabs (Derive, Deribit, Bybit, Binance, OKX, Thalex, Delta, Aevo; e.g. Deribit taker fee 0.03% of underlying, about $24.82 per contract, min 0.1 BTC, coin-margined, vega in BTC so multiply by spot). 05 Risk & reality check: execution risk (HIGH: cancel leg A if leg B not filled in 10 s), data latency (HIGH), liquidity (MED), collateral on both venues (MED), convergence time (LOW), "signal, not advice".
- **Notes**: the doc says the scanner lives on the Divergence page. Points to Calculator and Lead-Lag for follow-ups.
- **Caveat for a beginner**: this is advanced (needs funded accounts on two venues, margin, fast execution); the edge (0.5-1.1 vp) is small and fees/slippage can erase it. The "Live Opportunities" were repeats of the same few expiries refreshed every 30s (so the same signal appears many times).
- **Gating**: free.

## 3. Positioning workflow (practical)

1. **Regime check** (/btc/dashboard or /btc/gex-profile): spot vs GEX flip. Above flip + positive net gamma = expect mean-reversion/pinning near walls; below flip = expect trending/volatile.
2. **Levels** (/btc/gex-profile, All expiries, +-5% band): note call wall (resistance), put wall (support), flip. Then filter to the nearest 1-3 expiries (or /btc/greeks per-expiry bars) for the days' pin levels; check max pain table and implied-probability table.
3. **Confidence check** (/btc/greeks): toggle Flow signed vs Naive; levels that only exist under one convention are weak. Check flow-coverage % (long-dated expiries mostly naive).
4. **Second-order flows** (/btc/greek-exposure): charm tab for drift into expiry (0DTE/EOW), vanna tab for what a vol move would force; note C-neutral/V-neutral levels.
5. **Leverage/crowding** (/btc/futures/funding + /btc/futures/basis + term-structure): funding >0.03%/8h and APR basis >10% = crowded longs (fade breakouts / reduce size); negative funding with falling basis = crowded shorts. Flat 5-6% APR and ~0 funding (as seen) = neutral.
6. **Trend of carry** (/btc/futures/history): is basis APR rising or collapsing over 30-90D? Rising with spot = leverage building.
7. **Options structure context** (/btc/futures/oi-profile): P/C ratio and where the OI/market value sits.
8. **Optional advanced**: /btc/basis then /btc/arb-guide for cross-venue IV arbitrage, only after checking freshness and fees.

## 4. Data sources and freshness
- Options: live WS/REST aggregation from 12 venues, normalised; "Powered by Derive". Greek-exposure page is Deribit only. Max-pain/chain from `chain-latest`. Spot candles from Bybit. Futures from Binance, Bybit, Deribit, Kraken, OKX, Thalex. Funding from Binance, Bybit, OKX, Deribit.
- Several panels show per-venue staleness (greek-exposure "stale - 9m"; basis page freshness strip 59m-1h for options snapshots).

## 5. Bugs / empty states / oddities noticed
- /btc/greek-exposure/higher-greeks and /btc/delta-hedge: no such routes; silently redirect to /btc/dashboard even though a "Higher Greeks section" is referenced in a banner on /btc/greeks.
- /btc/gex-profile: "NO GAMMA DATA FOR THIS WINDOW" on default 24h range and on per-expiry filter; put wall can be above spot and above call wall in the All-expiries view.
- /btc/greeks: embedded "GEX profile" mini-panel stuck on LOADING; flow-sign coverage drops to about 20-40% on long-dated expiries.
- /btc/futures/funding: OKX "next funding 13h 18m" suggests wrong countdown for OKX.
- /btc/futures/basis: subtitle says Deribit only but lists all venues; FI_XBTUSD rows 0.00% (junk); currency dropdown includes a stray "U" item.
- /btc/futures/oi-profile: titled "Futures Market Value" but shows options OI.
- Gamma-flip values differ between pages ($82.7k cross-venue on greeks/gex-profile vs $79.9k Deribit-only on greek-exposure): different sources/models; state which one you use.
- Docs page says some features need signup but none gated in a logged-out session.
- Unknown routes fall back to dashboard (no 404 page).
