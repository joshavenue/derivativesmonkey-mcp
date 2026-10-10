# Derivatives Monkey - Recon notes, Group A (core, navigation, BTC core pages, IBIT, asset spot-check)

Observed 2026-10-10 (a Saturday; US equity market closed, so IBIT data is Friday-close). Live crypto data was flowing.
Things marked "(inferred)" were not directly confirmed.

---------------------------------------------------------------------
## 0. Site-wide: navigation, account model, settings, assets
---------------------------------------------------------------------

### Account / pricing / gating
- NO login, sign-up, pricing, paywall or subscription UI anywhere. Home page says "Free. No paywall." and "Open the platform. It's free."
- /pricing, /login, /signin, /signup, /account all just return the SPA shell (HTML fallback), i.e. no such pages exist. robots.txt disallows /api/, /auth/, /admin/ (an /auth/ route exists server-side but is not exposed in the UI).
- The Docs page labels the Strategy Engine / Strategy Scanner as "TOOLS - PAID" in its section tags, but the home page says everything is free and I saw no gate in the UI (did not open /btc/strategy; belongs to another group). Treat "PAID" tag as stale or aspirational.
- "TRADE NOW" / "POWERED BY DERIVE" button at top of every page and "TRADE ON DERIVE" on home are referral links to app.derive.xyz/trade/options?ref=derivativesmonkey (affiliate/ref - business model hint). Derive is the sponsor/data partner.
- Per-user state is stored only in the browser (localStorage): theme (btcv2-theme), language (btcv2:lang), custom dashboard layout (dash:layout:v1:btc, per asset), per-panel options (panel:v1:...), chart cosmetics, calculator mode. Nothing is tied to an account; clearing site data resets it. PostHog analytics is embedded.
- A small chat-bubble button bottom-right on dashboards opens a "Share feedback" box (message + optional name/email). Not used (would be submitting a form).
- Footer/home links: X @derivativemonky, Telegram @derivativesmonkey (contact), Privacy Policy (/privacy, SPA route), Docs.

### Landing page `/`
- Marketing page, "Derivatives Monkey: Free Crypto Options Analytics (BTC, ETH, HYPE & More)". Sections: hero ("Leading Crypto Option Analytics - Live flow, Greeks, and GEX. Every number stamped with its exchange and timestamp."), "What's inside" (exchange chips), four feature teasers with SAMPLE/illustrative numbers (Custom layout, Backtesting, Volatility, Dealer flow, Hedging; footnote "Sample snapshot data, illustrative only"), "How it works" (coverage list), CTA "Launch platform" and "Read the docs".
- Header: What's inside / How it works / Contact us / Docs / language (EN) / LAUNCH PLATFORM. "Launch platform" goes to the BTC app (/btc/dashboard).
- Home claims exchanges: Derive, Deribit, Bybit, OKX, Binance, Thalex, Paradex, Aevo, Delta, Bullish. The app itself actually lists 12 venues (adds Callput and Hypercall; Aevo is listed in selectors but not in the /btc/sources WebSocket table). Footer link groups: Data (Open Interest, Greeks, Vol Surfaces, Block/RFQ), Tools (Backtest, Scanner, Calculator).
- Note: the first time I navigated to "/" in the browser pane it landed on /btc/term (returning-user redirect, inferred); the second time it showed the landing page.

### App shell (every /<asset>/... page)
Top bar, left to right:
- Collapsible left sidebar (chevron at its right edge) with logo "DERIVATIVES MONKEY"; footer shows "v0.3 / 2026.05".
- "POWERED BY DERIVE" + "TRADE NOW" (referral button).
- Search (Cmd/Ctrl+K): command palette; type page names or keywords ('gex', 'skew', 'funding'); shows Group > description plus aliases (e.g. Scanner = "Filter options by IV, OI, delta, and flow"; Volatility Surface = "3D IV, GEX, vanna, charm surfaces"; Skew Analytics = "25 delta skew, risk reversal, smile analytics"; Volatility Anatomy = "ATM IV term structure across expiries"; Calculator = "BSM pricer, payoff diagram, multi-leg P&L"). Arrow keys navigate, Enter opens, Esc closes.
- Asset switcher (dropdown), 11 entries: BTC, ETH, HYPE, SOL, ZEC, AVAX, XRP, XAUT (gold token), LIT, VVV, PUMP1K. (The brief listed 8; LIT, VVV and PUMP1K are extra but are not in sitemap.xml.) Switching keeps you on the same page type under the new asset prefix (URL pattern /<asset>/<page>).
- Language dropdown (12): English, Espanol, Francais, Portugues, Simplified Chinese, Japanese, Korean, Turkish, Arabic, Deutsch, Russian, Hindi.
- Live price pill "BTC $82,752 x11" (asset spot and number of venues contributing; not clickable).
- Theme picker: TEAL (default), AMBER, QUANT.

### Left sidebar menu (identical for every asset except TradFi, which is IBIT-only)
Groups (collapsible; one open at a time) and items -> route (/btc/... shown):
1. DASHBOARD: Overview (/dashboard), Custom (/custom), Strike Insight (/strike-insight)
2. TRADFI (IBIT ETF options): Dashboard (/ibit), Vol (/ibit/vol), Greeks (/ibit/greeks), OI (/ibit/oi), Flow (/ibit/flow), Surface (/ibit/surface)
3. VOLATILITY: Volatility Anatomy (/term), Volatility Surface (/surfaces), Vol Metrics (/vol-metrics), Skew Analytics (/skew), IV Percentile (/iv-percentile), Volatility Risk Premium (VRP) (/iv-rv-vrp), Vol Index (MBVI) (/vol-index), Vol Regime (/vol-regime)
4. GREEKS: Levels (/levels), Dealer Positioning (/greeks), Greek Exposure (/greek-exposure), Heatmaps (/heatmaps), Exposure Heatmap (/thermography), Tail Strike (/tail-strike)
5. FLOW: Trade Tape (/tape), Options Order Flow (/order-flow), Volume Flow (/volume-flow), Open Interest (/open-interest), Scanner (/scanner)
6. BLOCK RFQ: Aggregated, Derive, Deribit, Paradigm (Deribit), Paradigm (Paradex) (/block-rfq/aggregated|derive|deribit|paradigm-deribit|paradigm-paradex)
7. MULTI EXCHANGE STATS: Divergence (/divergence), Lead-Lag (/lead-lag), Basis Spread (/basis)
8. PREMIUM: Premium Matrix (/premium)
9. FUTURES: Basis (/futures/basis), Term Structure (/futures/term-structure), Funding Rates (/futures/funding), Basis History (/futures/history)
10. STRATEGY: Monkey Strategy (/strategy), Monkey Scanner (/strategy/scan)
11. QUANT: Backtest (/backtest)
12. BUILDER: Calculator (/calculator)
13. RESOURCES: Arb Guide (/arb-guide), Stats (/stats), Docs (/docs)

Pages that exist (in sitemap, 58 per asset) but are NOT in the sidebar: /tape-adjacent ones like /spot, /sources, /posts, /blocks, /paradigm-flow, /gex-profile, /orderflow-v2, /quant, /delta-hedge, /futures/oi-profile, /greek-exposure/higher-greeks, /builder/break-even|simulator|basis|roll-pnl|option-pnl|straddle|combo-greeks|combo-pnl, /strategy/scan. IBIT hidden pages: /ibit/risk, /ibit/cross, /ibit/chart (8 IBIT pages in sitemap: /ibit, vol, greeks, oi, flow, surface, risk, cross, chart minus one; all nine load). Sidebar opens via URL only for these.

Sitemap: 473 URLs = 8 assets (btc, eth, hype, sol, zec, avax, xrp, xaut) x 58 + IBIT section + root. LIT/VVV/PUMP1K pages work (checked /lit/dashboard) but are not in the sitemap.

### Venue / data-source coverage (site-wide)
- 12 selectable venues: DERIVE, DERIBIT, BINANCE, BYBIT, OKX, THALEX, PARADEX, AEVO, DELTA, BULLISH, CALLPUT, HYPERCALL.
- Live WebSockets (from /btc/sources): Binance (fstream), Bullish, Bybit (v5 option), Delta (India), Deribit, Derive (v3), Hypercall, OKX, Paradex, Thalex. All 10 listed "enabled yes / live". Aevo and Callput selectable in UI but not in this table.
- BTC open-interest share (Stats page): Deribit 74.8%, Bullish 42.5k (~8.5%), OKX 5.7%, Bybit 3.9%, Binance 3.7%, Delta, Derive 1.1% (5.5k), Paradex ~0.3%, Hypercall ~3 contracts. Thalex shows "0 OI" for BTC and ETH.
- ETH: Deribit 52.8%, OKX 12.5%, Derive 11.1%, Bybit 10.5%, Binance 8.2%.
- HYPE: Derive 81.6%, Deribit 16.7%, Bybit 1.6% (HYPE dashboard says 5 venues: Derive, Deribit, Bybit, Paradex, + one more); OKX, Binance, Thalex = "no market".
- IBIT section uses ThetaData as options chain source (/api/market/chain-latest?source=thetadata&asset=ibit) and its own /api/ibit/* endpoints (spot, spot-vol-skew, dealer-gex, gex-map, oi-history, flow-wheel). Crypto pages use /api/market/* and WebSockets.
- Charts: BTCUSDT/XAUUSDT-style candlestick panels powered by "Vela" (a TradingView-style lib, drawing tools and indicators; "Charting by Vela" caption); IBIT charts use lightweight-charts; surfaces use Plotly/ECharts.

### Vocabulary used across the site (useful for beginners)
- vp = volatility points (IV 34.7 vp = 34.7% annualised vol). IV = implied vol; RV = realised vol (Parkinson high/low estimator, 30D trailing); VRP = IV - RV (negative = options cheap vs what actually happened).
- GEX = dealer gamma exposure in $ per 1% spot move. "Long gamma" = dealers dampen moves (mean-reverting); "short gamma" = they amplify. Gamma flip = price where net GEX crosses zero. Call wall / put wall = strikes with biggest positive / negative GEX or OI (resistance / support style levels).
- Term structure: contango = longer-dated IV higher than short-dated (normal); backwardation = short-dated IV higher (stress/event).
- MBVI / VOL INDEX = the site's own VIX-like index per asset (36.7 for BTC; NORMAL/ELEVATED/LOW/EXTREME tags).

---------------------------------------------------------------------
## 1. /btc/dashboard  (Overview)
---------------------------------------------------------------------
Purpose: one-screen summary of the options market for the selected asset, aggregated across all venues; the entry page ("Launch platform" target).

Shows (top to bottom):
1. KPI strip: Spot (BTC $82,752), ATM IV of nearest expiry (15.0% for 11OCT26 - very short-dated so it reads low; use the 30D number for a stable read), Term structure (Contango/Backwardation), Venues live (12 / 12), 24h put/call volume ratio (0.99).
2. "Market Summary" card (has a camera icon = save screenshot):
   - GAMMA & VOL: NET GAMMA ($210.1M, "Net long gamma - suppresses realized vol"); VOL REGIME (percentile label e.g. "CRUSHED - 5th pct"); IV vs REALIZED VOL (FAIR -4.3 vp: IV 34.7 vs RV 39.0); GAMMA FLIP ($82.7K, +0.13% from spot).
   - PRICE & VOLATILITY: cross-venue mid; ATM IV 7D and 30D; realised vol 30D trailing; VRP with bar vs 30D average; term-structure slope = 30D IV - 7D IV (+4.6 vp contango).
   - LEVELS & OPEN INTEREST: call wall ($83.0K, 3.5K OI), put wall ($80.0K, 18.0K OI), put/call OI ratio (0.72 "balanced"), total OI (502.5K contracts), top expiry (30OCT26, 192.6K OI), number of expiries/instruments (20 / 8,214).
3. VOL INDEX (multi-asset): tiles for BTC, ETH, HYPE, SOL, ZEC, AVAX, XRP, XAUT: index value, regime tag (LOW/NORMAL/ELEVATED/EXTREME), 24h change and sparkline (BTC 36.7 NORMAL, ETH 49.4, ZEC 102 EXTREME, XAUT 18.4 LOW at time of visit).
4. Options chain (single venue, single expiry): venue dropdown (Derive, Deribit [default], Binance, Bybit, OKX, Thalex, Paradex, Aevo, Delta, Bullish, Callput, Hypercall) + expiry dropdown (15 expiries from 10OCT26 to 31DEC27). Calls left, strikes center (with % distance from spot and an ATM marker), puts right. Columns: IV, Bid (you sell), Mark, Ask (you buy), each in coin units (BTC) and USD; Near (+/-20%) / Half (+/-50%) / Full strike range buttons; "ITM" shading legend; Settings popover to add columns (Leverage, OI, Volume, 24h Chg, Spread; Greeks Delta/Gamma/Theta/Vega; IV mode Mark IV or Bid/Ask IV; Size, Bid/Ask Size). Camera icon = screenshot. Note: bids/asks are colour-coded boxes; "you sell" = hit the bid, "you buy" = lift the ask.
5. SPOT chart: BTCUSDT candles (Vela chart, 1D default, timeframes 1D...ALL, drawing tools, Indicators menu including GEX Profile overlay seen on XAUT page).
6. VOL STRUCTURE: Term Structure curve (ATM IV vs days to expiry; FWD VOL / ALL / TENOR toggles; hollow dot = single-venue point) and "ATM IV vs Realized Vol" (30D IV, RV and VRP histogram below; Controls dropdown). Links to full pages.
7. POSITIONING: GEX profile (NAIVE vs PROPER model, "ALL SOURCES" selector, key levels: GEX flip, peak short gamma, spot) and Max Pain (per venue and per expiry bars, cumulative max pain, modal strike across 12 expiries = 79K; call/put/venue chips).
8. FLOW: Block RFQ strategy breakdown (Aggregated source; 24h/3D/7D; Count vs Notional) and Flow Wheel (24h taker flow: calls bought/sold, puts bought/sold; "NET BULLISH" label; Contracts/Premium/Notional). "FULL TAPE" link to /btc/tape.

How to use (practical):
- Read the Market Summary top-down in ~1 minute: (a) net gamma sign and gamma flip distance tells whether moves will be dampened or amplified; (b) VRP: strongly positive = options rich (premium selling favoured), negative = cheap (buying vol favoured); (c) term-structure sign; (d) call/put walls as likely pin/support-resistance; (e) put/call ratio for hedging skew.
- Use the chain to see real tradable quotes per venue; compare same strike across venues by switching the venue dropdown.
- Click "Full ..." links to drill into dedicated pages.
Data: all aggregated across the 12 venues; chain defaults to Deribit. Free, no login.
Quirks: The headline "ATM IV" tile uses the nearest expiry (a 1-day option) so the number can look very different from the 30D IV; "VOL REGIME CRUSHED - 5th pct" while Vol index tag says NORMAL (different metrics). Initial load shows a logo splash for ~3-5 s; some panels say "LOADING..." for a while on slower loads.

---------------------------------------------------------------------
## 2. /btc/tape  (Trade Tape)
---------------------------------------------------------------------
Purpose: live feed of every option fill across venues plus a flow summary.
Shows: venue filter tabs (ALL, DERIVE, DERIBIT, BINANCE, BYBIT, OKX, THALEX, PARADEX, AEVO, DELTA, BULLISH, CALLPUT, HYPERCALL), "Recent Trades - last 2000, cross-source" table with SRC icon, Time (UTC, ms), Expiry, Strike, Type (Call/Put), Side (BUY/SELL = taker side), Premium (in the venue's native unit, suffix shows it: BTC, USD, USDT, USDC), Size (contracts, in BTC; e.g. x0.100). Green live dot. "500 rows" cap selector. Newest on top; scrolling up pauses auto-pin.
Controls: ALL SOURCES dropdown, SPLIT (toggle: shows one column per venue side by side with rows count per venue, e.g. Derive 45 rows, Deribit 47, Binance 46...; extra venues via horizontal scroll), rows selector.
Below: "Flow wheel" donut: calls bought / calls sold / puts bought / puts sold as % with "trades 24h 278K" and a verdict (NET BULLISH); selectors: source, lookback (24h etc.), metric (Contracts / Premium / Notional).
How to use: watch for large prints and clusters in the same direction (e.g. repeated large call buys at one strike/expiry = directional thesis; big put buys near support often = hedging). Premiums are NOT normalised across venues, so compare size/notional, not raw premium numbers (USD vs BTC units). Side on rows with "." in IBIT = unknown side (mid).
Data: WebSocket trade channels from Derive, Deribit, Binance, Bybit, etc. (docs say OKX/Thalex not in the trade feed per the Stats page footnote).
Gating: none. Observed no bugs; the docs say tape can be filtered by expiry/strike/min premium, but I only saw source filters, SPLIT and row-count controls (docs partly stale).

---------------------------------------------------------------------
## 3. /btc/spot  (Cross-source spot)
---------------------------------------------------------------------
Purpose: compare the BTC underlying price as seen by each venue and spot-chart context.
Shows: "Cross-source spot" table - 11 sources live, median ($82,750.55), range in bps (16), per source: price, data age (28ms to 27s), drift vs median in bps. Sources observed: Aevo, Binance, Bullish, Bybit, Delta, Deribit, Derive, Hypercall, OKX, Paradex, Thalex. Prices are derived from each venue's option-ticker channel (the underlying/index price in the ticker). Note Bybit/Binance are USDT-denominated so they sit ~+8 bps above USD venues (docs text on page says ~0.5% historically, today it was 8 bps). Then: BTC VOL INDEX card (36.7, source Deribit DVOL, NORMAL tag, sparkline) and "Time at Price" (1D/3D/7D): 1h candles from Bybit with a volume-at-price (time-at-price) heat overlay showing where price spent time.
How to use: (a) spot drift/range as a data-quality gate: large bps range or stale (seconds-old) sources means averages are less reliable; (b) bright bands in Time at Price = acceptance zones/magnets, thin zones = fast travel.
Gating: none. Bugs: none observed; the page is a narrow centred column, hidden from the sidebar (reach via URL).

---------------------------------------------------------------------
## 4. /btc/stats  (Cross-asset Market Statistics)  [in sidebar under Resources]
---------------------------------------------------------------------
Purpose: side-by-side market state for BTC vs ETH vs HYPE (NOT the selected asset - it ignores the asset switcher; docs describe an older per-asset version).
Sections: 
1) Volatility scoreboard: bars for ATM IV 30d (BTC 34.6, ETH 47.1, HYPE 53.1), MBVI index (38.5/52.0/59.3), Parkinson realised vol (39.0/51.3/69.5), VRP (-4.4/-4.2/-16.4; left of zero = vol cheap), IV rank 52-wk (49.9/9.5/43.3).
2) OI share by exchange: stacked bars per asset (BTC 502.4k total, ETH 2.66M, HYPE 3.61M) and an asset x venue heatmap of share %.
3) 24h premium flow: call vs put notional and net bias (BTC calls $17.49M / puts $14.91M, C/P 1.17, 269k trades; ETH 1.20; HYPE 1.17). Flow covers Derive, Deribit, Binance, Bybit only (OKX and Thalex not in the trade feed).
4) Regime strip: each tile tinted by gamma regime, with phase (CONSOLIDATION/COMPRESSION), gamma flip + distance, term slope, IV rank.
5) Coverage/freshness heatmap (asset x venue: LIVE + expiry count, 0 OI, or N/A no market) and 25-delta risk-reversal bars per tenor (left of zero = put skew), link "Full skew term structure".
How to use: quick relative-value read across the three main assets (which asset's vol is cheapest vs realised, where positioning sits, who is long/short gamma). Great for picking which underlying to trade.
Gating: none. Inconsistency noticed: static explanatory text under section 3 says "All three lean put heavy and net negative" while live numbers show calls 54% / net positive - the prose is hard-coded and can be stale. Skew sign convention differs from /btc/docs (Stats: risk reversal, left of zero = put skew; Docs: 25D skew = put IV minus call IV, positive = puts richer).

---------------------------------------------------------------------
## 5. /btc/levels  (Key Levels)
---------------------------------------------------------------------
Purpose: GEX-derived support/resistance map plotted on a live price chart.
Shows: header chip LONG GAMMA, "BTC - GEX-weighted - All expiries"; source toggle DERIVE / DERIBIT (options source; price is Bybit BTC); timeframe buttons 15M, 30M (default), 1H, 4H, 1D, 1W; RESET. Candlestick chart (TradingView-style) with horizontal lines for GEX Flip and put/call walls; header stats GEX FLIP, NET GEX, REGIME. Table: Level / Strike / vs Spot / GEX strength bar: Call Wall 1, Call Wall 2, GEX Flip, Put Wall 1-3.
Observed values: Deribit: flip $83,494, net GEX $159.49M, walls: C $90K, $95K; P $78K, $79K, $75K. Derive: flip $81,004, net GEX $4.19M, C $85K, $100K; P $75K, $70K, $65K. So the venue choice changes the levels a lot - Deribit has by far the larger book (use it, or the dashboard "all sources" figure ($82.7K flip), as the primary read).
How to use: treat call walls as resistance/pin zones and put walls as support; price above flip = dealer-stabilised, below = dealer-amplified. Check whether spot is near a wall into expiry. Combine with Greeks/Dealer Positioning page.
Quirks: switching to Derive briefly shows "N/A / no levels available" for a few seconds before data arrives. Footer shows "LIVE - 0S AGO - DERIBIT OPTIONS - BYBIT BTC 30M". Docs say it lives at /levels with 3 levels; actual page shows 6 rows (2 call walls, flip, 3 put walls).

---------------------------------------------------------------------
## 6. /btc/sources  (Source state / observability)
---------------------------------------------------------------------
Purpose: status page for data feeds. Table: SOURCE / ENABLED / CONNECTED / WS URL for Binance (wss://fstream.binance.com/market), Bullish (wss://api.exchange.bullish.com/trading-api/v1/market-data/orderbook), Bybit (wss://stream.bybit.com/v5/public/option), Delta (wss://socket.india.delta.exchange), Deribit (wss://www.deribit.com/ws/api/v2), Derive (wss://api.derive.xyz/v3/ws), Hypercall (wss://api.hypercall.xyz/ws), OKX (wss://ws.okx.com:8443/ws/v5/public), Paradex (wss://ws.api.prod.paradex.trade/v1), Thalex (wss://thalex.com/ws/api/v2). All showed enabled yes / connected live.
Below: "SOURCE UPTIME (24H)" strip chart (legend: connected / disconnected / no data) - it stayed on "loading..." for 15+ s in my session (possible bug / slow endpoint).
How to use: sanity check before trusting a metric; if a venue is disconnected, aggregates exclude it. Hidden from sidebar. No gating.

---------------------------------------------------------------------
## 7. /btc/docs  (Documentation) - summary
---------------------------------------------------------------------
Single long page with left TOC. Content (paraphrased):
- Overview: multi-asset options analytics terminal; normalises quotes/trades/greeks across venues, preserving exchange of origin. Says "BTC, ETH, HYPE" and "five venues (Derive, Deribit, Binance, Bybit, OKX)"; says HYPE only on Derive and Bybit; "Every number carries provenance" (source badge, timestamps). THE DOCS ARE STALE vs the live app (now 8-11 assets, 10-12 venues).
- Venues: Derive (on-chain, deep long-dated), Deribit (benchmark, DVOL source), Binance (coin-margined; geo-blocked for some regions), Bybit (USDT-settled, fastest), OKX.
- Core concepts: IV (annualised 1-sigma; 60% IV ~ +/-3.5%/week; mean-reverting), ATM IV, IV percentile, DVOL; GEX (sum of gamma x OI x spot^2 x 0.01, dealer sign-flipped; positive GEX = dampening, negative = amplifying; call wall, put wall, gamma flip; "directional not predictive"; GEX resets at expiry); Open interest (by strike / expiry / change; OI + GEX shows pin risk); Skew (25-delta put IV minus call IV; positive = puts richer/bearish; crypto can flip; contrarian signal at extremes); Greeks (delta, gamma, vega, theta, plus charm, vanna, volga).
- Page guides: Dashboard (market summary, vol regime chip, source badges, live tape); Trade Tape (BUY/SELL from taker view, source badge, premium, live/reconnect chip; large $500k+ prints cluster around moves; filter by expiry/strike/min premium); IV Surface and Term Structure (smile/smirk, term inversion, hollow dot = single-venue; backwardation = calendar spread idea); IV Percentile (>80% expensive/sell premium, <20% cheap); GEX Profile (bars by strike, GEX heatmap, GEX over time); Key Levels; Stats; Skew Analysis (history, by maturity, constant maturity, sparklines; skew vs spot divergence = hedging warning); Greeks Heatmaps (gamma, charm, vanna, vega, theta over strike x expiry); Order Flow (flow scoreboard, direction volume, whale bubbles >=$1M, cumulative GEX bars); Block RFQ (Deribit block-trade REST feed + Derive RFQ via Telegram; quoted vs filled; strategy breakdown e.g. risk reversal, calendar, condor); Cross-Exchange Divergence (IV disagreement - usually 1-2 vp, >5 vp = mispricing; basis spread USD vs USDT venues; freshness strip; gamma spread; lead-lag matrix at 1s/5s/15s); Vol Regime (ATM IV vs Parkinson RV, VRP, vol cone, weekly variance, IV percentile bands, DVOL key levels, Hidden Markov regime timeline and transition matrix, Lorenz regime); Quant/ML (Isolation Forest anomalies on tape, XGBoost 1-hour direction probability, regime softmax, feature importance, calibration curve - "read calibration before trusting"); Arb Scanner (cross-venue ATM IV spreads net of fees; net edge in vol points; /arb-guide interactive guide); Strategy Engine (BB1: bias + venue + expiry -> ranked structures; labelled PAID); Options Calculator (multi-leg builder, payoff at expiry with 1/2/3 sigma bands, payoff heatmap spot x time, live greeks, templates).
- Tips repeated: lead with regime, then skew, then pick structure; use heatmap not just expiry payoff.
Gating: none to read. Links at the bottom: OPEN DASHBOARD -> /dashboard (note: that bare route is not a real asset route; it may redirect), ARB GUIDE -> /arb-guide.

---------------------------------------------------------------------
## 8. /btc/posts  (Market briefings)
---------------------------------------------------------------------
Purpose: archive of daily desk notes + on-demand AI-style draft generator.
Shows: "Archive: No posts available yet." (empty state - feature unpopulated). "Draft generator": FLAVOR chips (SNAPSHOT default, GEX, VOL, WHALES, ANOMALY), optional ANGLE text box (placeholder e.g. "BTC at key GEX level, vol term inverted..."), SOURCES checkboxes (all 12 venues checked), GENERATE DRAFT button. I did NOT press Generate (it would submit a request; output unknown, likely a text market post built from live data - inferred).
Use: write-up helper for social/desk posts. Hidden from sidebar. Gating none visible.

---------------------------------------------------------------------
## 9. /btc/custom  (Custom Dashboard)
---------------------------------------------------------------------
Purpose: build your own panel wall from the platform's widgets.
Shows: header "Custom Dashboard BTC", "Auto-saved" indicator, buttons "Add panel" and "Edit layout". Default layout: Term Structure, GEX profile, Recent Trades (last 200, 50 rows), Max Pain by Expiry (table of expiry/DTE/per-source), etc. in a grid.
Add Panel drawer: search box, category chips, "126 panels" in total. Categories and examples (size WxH grid units): Spot (Spot Volume Profile, Spot Basis, Price Chart, Spot Matrix); Term Structure (Term Structure, Realized Term Structure, Term Watermarks, ATM Active Maturities, Vol Cone, Bi-Modal Term Structure, IV Crush Calendar); Volatility (DVOL, MBVI, DVOL multi-asset, ATM IV vs RV, VRP chips, RV/VRP table, IV Percentile Bands, IV Boxplots, Weekly Variance, Vol Lifecycle, Vol Regime (Markov), IV Arb Scanner, DVOL Key Levels, Implied Move, IV Crush Scanner, IV Print Scatter, Time at Price); GEX (GEX Profile, GEX by Strike, Gamma Profile, Cumulative GEX, Gamma Flip, GEX/VEX Domain Heatmaps, DEX by Strike, Strike Footprint); Open Interest (OI by Strike/Expiry/Type/Change, Max Pain, OI Concentration, Expiry Exposure, Put/Call Ratio History, 0DTE Distribution, Straddle Range, Fresh Positioning Ratio); Flow (Flow Scoreboard, Trade Tape, Bybit Trade Tape, Direction Gauge, Flow Aggregate, Whale Bubbles, Bubble Tape, Anomaly Feed, Alert Strip, Cross-Order Ratios, Sentiment Check, DEX Table, Divergence Events, Lead-Lag Matrix, Moneyness/Net Premium Flow, Volume Concentration/by Strike/by Expiry, Net Delta Tape, Vol Flow Gauge); Greeks (Vanna Exposure, Greek P&L, IVR/Gamma Flip); Skew (Skew by Maturity, Constant Maturity, CM History, Skew vs Spot, Sparklines, Watermarks, Risk Reversal historical, Wing Richness Grid); Surface (Vol Surface, SVI, Heston, Rough Vol, Merton Jump, P&L Surface, Probability Cone, Implied Probability, Tail Risk, IV Surface 3D); Regime (Regime Status, Timeline, Softmax, Lorenz); RFQ (Deribit/Derive/Paradigm RFQ, strategy popularity/mix, Block RFQ, Paradigm flow analytics + Telegram flow, Strategy burst feed, rotation heatmap, strike ladder, whale block leaderboard); Summary (Vol Regime Badge, Direction Signal Equity, Direction Model Calibration, Anomaly Model Feature Importance, Source Health History, Strategy Scanner); Premium (Premium Matrix).
How to use: Add panel -> pick -> drag/resize (resize from corner per landing page) -> layout auto-saves per asset in your browser (localStorage key dash:layout:v1:<asset>), so it does not follow you across devices/browsers. Edit layout toggles move/resize/remove mode (inferred). Gating: none; no login needed.

---------------------------------------------------------------------
## 10. IBIT section (iShares Bitcoin Trust ETF options, TradFi)
---------------------------------------------------------------------
General: a US-equity ETF-options analytics module separate from the crypto venues. Sub-nav tabs at top of each page: DASHBOARD, VOL, GREEKS, OI, FLOW, SURFACE (RISK, CROSS and CHART exist but are hidden, reachable by URL). Data: ThetaData chain; US-listed option trades with NBBO bid/ask for trade signing; session-based (US hours). On a weekend, data is Friday close and a chart badge shows "OPENS IN hh:mm:ss". Free. Heavy pages need ~8-10 s to populate.

### /ibit  (Dashboard)
- KPI cards: IBIT spot ($46.55, +0.29 / +0.63%), ATM IV (near) 32.2% for Oct 12 '26, number of expirations (28), Call OI (115.0k, peak expiry Oct 30 '26), Put OI (104.9k).
- 15m candlestick chart (volume; same drawing/indicator toolkit; ranges 1D...ALL) with a dotted last-price line and market-open countdown.
- Options chain (ThetaData): expiry dropdown (28 expiries Oct 12 '26 ... Jan 19 '29; default seemed to be Oct 30 '26), Settings; columns per side: IV, Delta, Bid size, Bid, Mark, Ask, Ask size; strike center with ATM highlight; draggable column handles. Quirks: deep ITM calls show IV "n/a" and delta 1.0000 (no IV solved); reading chain for Oct 12 shows "ATM IV near 32.2%" on the card, whereas /ibit/risk and /ibit/cross call the same expiry's ATM IV 19.1% - inconsistent definition (likely 30D-ish vs nearest-expiry) - treat with caution.

### /ibit/vol  (Volatility)
Sections: IV Smile by Strike (per expiry selector, calls vs puts, spot marker; takes a few seconds to render); ATM IV Term Structure (All/Near/Mid/Long); 25-delta Risk Reversal (call IV - put IV, by tenor); IV vs Realized Vol 30d (Daily/Intraday; IV30 35.6%, RV30 39.3%, VRP -3.7% "Options cheap", IV/RV 0.91x); IBIT price coloured by 30D ATM IV or skew (VOL / SKEW toggle, timeframes 5m...1d, zoom); IV Percentile & Summary (52-week: IV rank 6, percentile 9, range 32.4%-86.0%, regime LOW VOL); Volatility Metrics heatmap (Inferno colormap); "IBIT vs Crypto Exchanges: 30d ATM IV" (IBIT 35.6% vs Deribit BTC 34.4%, spread +1.2%, avg +1.6%, spread percentile 32 = Normal).
Use: IV rank 6 / percentile 9 = ETF options near the cheapest end of the year; negative VRP = realised exceeding implied; spread to Deribit shows if the ETF vol trades rich/cheap vs crypto-native.

### /ibit/greeks  (Dealer Positioning)
"Dealer Greeks Map": heat-map of estimated dealer gamma (or Charm) by price over daily history (May-Oct), with candles. Controls: GREEK (Gamma | Charm), VIEW (Daily | Intraday), MODEL (Signed flow | OI only), EXPIRIES (All | <=30d | <=7d), info and camera icons. KPI row: Net dealer gamma (-$31.9M, "MOVES AMPLIFIED" per 1% move; spot $46.75 = BTC $82.3k), Gamma flip ($53.46 = BTC $94.1k, +14.4%), Resistance ($48.00), Support ($46.00), Acceleration ($45.00; strike with most negative dealer gamma = hedging accelerates a break through it), each also expressed in BTC-equivalent. Red = dealers short gamma, green = long gamma; "Full colour = $50.5M / 1%"; last column provisional until next morning's OI report (06:30 ET).
"How this is calculated" (expand): sign each trade using NBBO (>= ask = buy, <= bid = sell; inside spread counts half; mid = unknown; last session 85% at bid/ask, 11% inside, 4% unknown, 23% multi-leg); infer opens/closes from next-day OI change weighted by buy-sell imbalance; customer position = imbalance x |OI change|, dealer = minus customer; gamma from Black-Scholes with each contract's own IV; GEX ($ per 1%) = gamma x dealer contracts x 100 x spot^2 x 0.01; history = 473 sessions signed from 2024-11-19. Caveat on page: estimate, assumes dealers are counterparties.
Use: price tends to be pinned near resistance/support strikes when dealers are long gamma and runs through "acceleration" levels when short gamma; since IBIT tracks BTC the BTC-equivalent levels let you map to spot BTC.

### /ibit/oi  (Open interest)
OI by Strike (contracts; expiry selector ALL or one date; C / C+P / P toggle; "Contract" toggle (units); max pain and spot lines); OI by Expiry (nearest 15 + 14 monthly-summed, C/C+P/P; SHOW ALL 29); Open Interest Heatmap (strike x time with IBIT price overlay; appeared mostly blank in my capture - possible slow load); Historical OI Change by Expiry (session-over-session change in contracts, Total or Calls/Puts split, e.g. 2026-10-07 close -> 2026-10-08 close).
Use: where positioning sits (big strikes act as magnets near expiry), where new money opened/closed.

### /ibit/flow
Flow Wheel (taker flow in IBIT options last 1D/3D/7D; metric Contracts/Premium/Notional): 7D notional: calls bought 33.2%, calls sold 30.2%, puts bought 19.7%, puts sold 17.0%; 379K trades. Trade Tape for IBIT: SRC (I icon), Time, Expiry, Strike, Type, Side (BUY/SELL, or "." when at mid/unknown), Premium (USD), Size (contracts). Times to ms, last print 15:59:59 (Friday close). Many multi-leg/exchange-split lines repeat identical prices (same print split across lots).
Use: gauge retail/institutional positioning in the ETF; heavy call buying vs put buying; large single prints.

### /ibit/surface
"VOL SURFACE" with a view dropdown plus Heatmap | 3D toggle; 3D surface axes Volatility, Delta (put wing 5p-25p, ATM, 25c-5c), and Expirations (Oct-Jan'29); zoom +/- and reset. Colour red = high IV, blue = low. Shows put-side skew and the term structure at once.

### /ibit/risk (hidden)
Pick an expiry (28 listed with DTE). Cards: Term structure regime (Contango: front 19.1% -> back 48.3%, slope +29.1%, "calendar sellers harvest the roll"); "Probability cone" for the chosen expiry with an input "P(above $ strike by date)" (enter a strike to get a probability); "Break-even calculator": click a call or put in the lists (strike + premium) to calculate break-even and presumably % move needed ("Select a contract to calculate break-even").
Use: risk framing before buying options (what move is required, what probability is implied).

### /ibit/cross (hidden)
Cross-asset vol comparison: IBIT ATM IV (19.1% nearest expiry) vs Deribit BTC DVOL (36.7%) vs Derive BTC ATM 30D (33.0%), with differences (-17.6%, -13.8%) and verdict ("IBIT vol cheaper than BTC spot (ETF options under-priced)"); 30-day history chart of DVOL, Derive ATM and a dashed line for IBIT ATM IV now; table by expiry: IBIT ATM IV, vs Deribit, vs Derive and SIGNAL (IBIT discount / aligned / IBIT premium). Pattern: short expiries show a big discount (weekend decay + definition mismatch), long-dated expiries (>150d) show a premium. Caveat: comparing 1-day IBIT IV with a 30D DVOL is apples to oranges - read the matching-tenor rows.

### /ibit/chart (hidden)
Full-width IBIT chart (1m/5m/15m/1D/1W/1M, EXP selector All Expiries or one date, drawing tools, Indicators) with a right-hand "LEVELS - ALL EXP" panel: Call wall ($50.00, +7.4%), Put wall ($20.00, -57.0%), Max pain ($45.00, -3.3%), +/-1 sigma move (47.66 / 45.44), ATM IV 32.2% (2d to expiry), spot 46.55. Option levels can be overlaid on the chart. Note put wall $20 is a far-OTM OI strike, not a realistic support (max OI strike, not GEX-weighted).

---------------------------------------------------------------------
## 11. Other assets spot-check
---------------------------------------------------------------------
Same page structure and nav for every asset (8 sitemap assets x 58 routes; plus LIT, VVV, PUMP1K via the switcher). Data depth differs:

- HYPE (/hype/dashboard): fully populated. Venues "5 / 5". Spot $83.75, ATM IV (11OCT26) 32.9%, 30D IV 53.1 vp vs RV 69.5 (VRP -16.4, "vol underpriced"), net gamma +$1.9M, flip $84.1, call wall $85.0 (258K OI), put wall $80.0, P/C OI 0.42, total OI 3.6M, 11 expiries / 2,284 instruments. Chain venue selector defaults to Derive (nearest expiry quotes can show $0 bids/asks on far-OTM strikes: thin book). Mostly Derive liquidity (81.6% of OI) + Deribit 16.7%. Bybit 1.6%, Paradex small; OKX/Binance/Thalex = no market. Docs claim HYPE only on Derive+Bybit (stale).
- XAUT (/xaut/dashboard): gold-token options. Spot $4,184, ATM IV (11OCT26) 13.5%, 30D IV 19.7 vs RV 24.9, term structure BACKWARDATION (-6.2 vp), P/C OI 0.36, total OI 19.7K, 9 expiries / 733 instruments, top expiry 10OCT26. Header says "Venues 12/12" though data effectively comes from few venues (chain tab default DERIBIT shows "NO ROWS YET: NOTHING HAS BEEN INGESTED FOR DERIBIT - 2026-10-30"; switching to Derive loads strikes ~3,500-5,000+). ATM IV vs RV chart shows "SPOT HISTORY ACCUMULATING - RV appears after 7D of spot data" (new asset). The spot chart is XAUUSDT with the GEX Profile overlay and wall lines. So some panels are empty for newer/less liquid assets, and the default venue (Deribit) is wrong for it - user must switch the venue dropdown to Derive.
- LIT (/lit/dashboard): one venue ("1 / 1"), spot $3.69, ATM IV 98.7%, 5 expiries / 202 instruments, 401.9K OI, flip $3.88 (-5.05% from spot), RV window 7D trailing (short history). Works but thin.
- Vol Index tiles on the non-BTC dashboards loaded after BTC's (skeleton for a few seconds).
- Takeaway: BTC and ETH have the full venue set; HYPE ~5 venues; SOL/ZEC/AVAX/XRP/XAUT/LIT/VVV/PUMP1K have fewer venues (mostly Derive-led) - (inferred for SOL/ZEC/AVAX/XRP/VVV/PUMP1K, which I did not open; their Vol Index tiles exist).

---------------------------------------------------------------------
## 12. Quick "how to start" for a beginner (derived from the above)
---------------------------------------------------------------------
1. Open /btc/dashboard. Read Market Summary: gamma sign + flip, VRP, term structure, walls.
2. Check /btc/levels (Deribit toggle) for walls/flip on a chart; /btc/tape for who is trading what right now.
3. Compare assets at /btc/stats (BTC/ETH/HYPE).
4. Before trusting numbers, look at /btc/spot (price agreement) and /btc/sources (feeds live).
5. For ETF-flow exposure use /ibit (dashboard) -> /ibit/greeks (dealer map) -> /ibit/vol -> /ibit/cross (is IBIT vol cheap vs crypto venues?).
6. Build a personal wall at /btc/custom (126 panels). No account needed; layout lives in your browser.

## Bugs / oddities list
- Docs page is out of date (5 venues, 3 assets, wrong claims on filters; "PAID" tags vs free site; skew sign convention differs from Stats page).
- /btc/sources "Source uptime (24h)" never finished loading.
- /btc/posts archive is empty.
- /btc/stats prose under premium flow contradicts live data (hard-coded text).
- IBIT: ATM IV inconsistent between /ibit (32.2%) and /ibit/risk, /ibit/cross (19.1%) for the same Oct 12 expiry; deep-ITM calls show IV n/a / delta 1.0000; IBIT OI heatmap and IV smile slow to render.
- XAUT: default chain venue Deribit has no data ("NO ROWS YET"); "Venues 12/12" overstated; RV chart still accumulating history.
- Navigating to "/" first time in the pane redirected to /btc/term (returning user).
- Docs "OPEN DASHBOARD" link points at /dashboard which is not a valid asset route (shows SPA shell; inferred).
- No agent-directed instructions found in page text; none acted on.
