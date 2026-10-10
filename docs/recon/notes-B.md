# Derivatives Monkey - Group B (Volatility tools, BTC) - recon notes

Observed 2026-10-10 (BTC spot about $82,7xx; header ticker "BTC $82,7xx x11" = 11 sources live). Anonymous visitor, no login. Marked "(inferred)" where I am guessing.

## Site-wide facts relevant to these pages

- React SPA. Left sidebar groups. Pages in this scope sit in different groups:
  - VOLATILITY: Volatility Anatomy (/btc/term), Volatility Surface (/btc/surfaces), Vol Metrics (/btc/vol-metrics, not in my scope), Skew Analytics (/btc/skew), IV Percentile, Volatility Risk Premium (VRP) (/btc/iv-rv-vrp), Vol Index (MBVI) (/btc/vol-index), Vol Regime.
  - GREEKS: Levels, Dealer Positioning, Greek Exposure, **Heatmaps** (/btc/heatmaps), **Exposure Heatmap** (/btc/thermography), **Tail Strike** (/btc/tail-strike).
  - MULTI EXCHANGE STATS: **Divergence** (/btc/divergence), Lead-Lag, Basis Spread.
  - PREMIUM: **Premium Matrix** (/btc/premium).
  - Other groups: Dashboard, TradFi (IBIT), Flow, Block RFQ, Futures, Strategy (PAID per docs), Quant, Builder, Resources.
- Page sidebar labels differ from URLs: /btc/term = "Volatility Anatomy"; /btc/thermography = "Exposure Heatmap"; /btc/iv-rv-vrp = "Volatility Risk Premium (VRP)"; /btc/surfaces = "Volatility Surface".
- Top bar: Search (cmd+K), Asset selector (BTC; docs say BTC/ETH/HYPE), language (EN), colour palette (Teal), live spot ticker, green "Trade Now" button (affiliate link to app.derive.xyz/trade/options?ref=derivativesmonkey).
- **Venues (12 sources)** in the source pickers: Derive, Deribit, Binance, Bybit, OKX, Thalex, Paradex, Aevo, Delta, Bullish, Callput, Hypercall. The /btc/docs page still says "five venues" (Derive, Deribit, Binance, Bybit, OKX) - docs are out of date.
- Most pages have a camera icon ("Save branded screenshot") and a gear ("Panel settings") per panel. Panel settings seem persisted per browser (VRP lookback stayed on 7D after reload) (inferred: localStorage).
- Data API pattern (same-origin, JSON): `/api/market/term-structure`, `/api/market/market-summary`, `/api/market/chain-latest?source=`, `/api/market/expiries-all`, `/api/market/sources-all`, `/api/market/iv-term-history?source=&lookback_days=`, `/api/market/atm-vs-rv?lookback_days=&sources=`, `/api/market/spot-candles?asset=btc&tf=1H&source=bybit`, `/api/market/term-structure/watermarks?asset=btc&lookback_days=`, `/api/market/iv-percentile/search?min_pct=&max_pct=&lookback_days=90`, `/api/market/iv-boxplot`, `/api/market/mbvi-candles?resolution=15m&source=deribit`, `/api/market/mbvi-index`, `/api/market/iv-smile?source=&expiry=`, `/api/market/rr-history?tenor=&lookback_days=&sources=`, `/api/wings?source=&expiry=`. Also a websocket-fed feed (Divergence events, Arb scanner). Spot candles come from Bybit.
- Gating: **every page in my scope loaded fully with no login wall.** `/auth/refresh` returns 401 (anonymous) and `/api/site-notice` returns 404 on every page (harmless noise). Docs say Strategy Engine/Scanner are "PAID" and "Sign up for full access to GEX Profile, Arb Scanner, Divergence panels, Strategy Engine" - but Divergence and its Arb Scanner section were fully visible to me, so that docs sentence looks outdated.
- No page text addressed to AI agents was seen.

## Beginner glossary (used throughout)

- **IV (implied volatility)**: the annualised % move the options market is pricing. 30% IV ~ market expects BTC to move about +/-30% over a year (1 standard deviation). Rule of thumb: daily move = IV / sqrt(365) (the site shows e.g. 38.6% IV -> about 2% a day; its "daily implied move" for BTC = $649 = 0.78%, which is the 1-day ATM IV 15% scaled).
- **ATM IV**: IV of the option struck at the current price; the cleanest single read of "how expensive are options".
- **RV (realised vol)**: how much price actually moved. The site uses the **Parkinson** estimator (uses each candle's high/low, so it captures intraday range).
- **VRP (volatility risk premium)** = IV minus RV. Positive = options are priced above what price actually did (sellers of vol have been paid). Negative = options cheaper than actual movement.
- **Term structure**: ATM IV plotted against days to expiry. **Contango** = longer expiries higher IV (normal, calm). **Backwardation / inversion** = near expiries higher than far (stress / event).
- **Forward vol**: the vol implied for the gap between two expiries (e.g. what is priced for days 30 to 60), derived from the term structure.
- **Skew / risk reversal (RR)**: difference between OTM put IV and OTM call IV at the same delta. "25 delta" = options about 25% likely to finish in the money. Puts richer than calls = traders paying for downside protection.
- **Wings**: far OTM options (10 delta). "Wing richness" = how pricey the tails are vs ATM.
- **IV percentile / rank**: where today's IV sits within its own recent history (0 = lowest in the window, 100 = highest).
- **Delta-strikes**: columns like 10dP 25dP 35dP ATM 35dC 25dC 10dC mean puts/calls by delta, not by strike price.
- **GEX / VEX**: dealer gamma / vanna exposure. **OI**: open interest = contracts outstanding.
- **vp / vols**: volatility points (1 vp = 1 percentage point of IV).

---

## 1. /btc/term - "Volatility Anatomy" (ATM-IV by tenor)

**Purpose**: One-stop view of BTC's volatility term structure: how ATM IV varies by expiry, how it has changed over time, and what move each expiry implies.

**Panels (top to bottom)**
1. **Term Structure** (line chart, x = days to expiry log-ish axis 14h to 811d, y = ATM IV %). Cross-source mean ATM IV per expiry. Solid dot = cross-venue average, **hollow dot = single-venue point** (only one venue quotes that expiry). Observed: 14h ~15%, 2d ~19%, 6d ~30%, 13d ~31%, 27d ~34.5%, 48d ~36%, 349d ~39%; i.e. clean **contango**.
   - Buttons: **FWD VOL** (toggle; adds a dashed forward-vol curve - it spikes/bumps in the short end, which shows where the market prices extra vol for specific windows); **ALL / TENOR** (ALL = one continuous curve; TENOR = colour-splits the curve into Short <=14d (green), Mid 14-60d, Long >60d with a legend); **gear** = Sources multi-select (All sources or any of the 12 venues).
2. **Historical IV Curves** (tenor 1d to 90d): buttons NOW, 1D, 1W, 1M plus a **date picker "Add a date to overlay"**. It draws today's curve (white) against the curve from 1 day / 1 week / 1 month ago (grey dotted) or any chosen date. Use it to see whether the whole curve moved up/down or twisted. (Single venue: Derive, from `iv-term-history?source=derive`.)
3. **Spot-Vol**: spot price (Oct 10 to Oct 1 ... ~2.5 weeks) drawn as dots coloured by IV (blue = low 32.6%, red = high 38.0% in the range seen). Shows whether vol rises when spot falls (usual in BTC) or rises with rallies.
4. **ATM IV Term History**: lines for 7d, 14d, 30d, 60d, 90d constant-maturity ATM IV over ~14 days (lookback 35d fetched), hover tooltip shows all five at once, range slider at the bottom to zoom. Observed 7d ~27-37%, 90d ~35-37%. There is a visible data gap around Oct 7-8.
5. **ATM Active Maturities**: same style but per actual listed expiry (7D/14D/30D/60D/90D chips).
6. **Implied Move** table (per expiry): days, date, **expected price range** (e.g. 1d: $82,258 to $83,246, +/-$494 = 0.6%), ATM IV, **percentile rank**, and a CHEAP / RICH style badge. Header cards: Spot $82,752; **Daily implied move $649 (0.78%/day)**; **Cheapest expiry** (26JAN29, 5th pct = "buy vol"); **Richest expiry** (27NOV26, 30th pct = "sell vol"); a chip "CONTANGO" that flips when the curve inverts (inferred). Shows 15 of 19 expiries; "SHOW ALL 19" expands; "Sources: 12".
   - Observed: every expiry was labelled CHEAP (percentiles 5th to 30th), i.e. vol was low relative to its recent history on 2026-10-10.
7. **IV Regime Bands**: for 7D/14D/30D/60D/90D: current ATM IV, an "IVR" number (IV rank 0-100: 25, 26, 19, 30, 5 observed), and a percentile (21st, 22nd, 9th, 48th, 25th). Legend: Low (<30), Mid (30-70), High (>70). A small bar chart summarises (0-60 axis).

**How to use**
- Check the shape first: contango (normal) vs inversion (fear). Steep inversion = event or panic; calendar-spread idea per docs: sell front, buy back when front is inflated.
- Use the Implied Move table to turn IV into dollars: "is a +/-$X range plausible for my expiry?" Compare with your thesis; if you expect a larger move than implied, options are cheap (buy); smaller, expensive (sell).
- Use percentile rank / IVR to decide cheap vs rich: low rank (<30) = options cheap relative to history -> favour buying vol/long options; high rank (>70) -> favour selling/spreads. Combine with VRP page.
- Use Historical IV Curves with 1W/1M to see if the curve is rising (market getting nervous) or sagging.

**Data**: all 12 venues aggregated (docs say 5; site now 12). Live REST polling (no explicit WebSocket seen). **Gating**: free. **Bugs/oddities**: gap in the ATM IV history around Oct 7-8; Historical IV Curves only uses Derive data; page appears to get a different percentile ranking per expiry (none above 30th), so "RICHEST" label can be misleading when everything is cheap (richest = 30th percentile).

---

## 2. /btc/iv-rv-vrp - Volatility Risk Premium (IV / RV / VRP)

**Purpose**: Compare ATM implied vol with Parkinson realised vol and show the spread (VRP) over time and by tenor.

**Panels**
1. **ATM IV vs Realized Vol** chart: white line = IV, teal line = RV, lower histogram = VRP (teal bars positive, red negative), right axis shows last values (e.g. IV 32.7%, RV 32.6%). Tooltip box shows e.g. "30D IV 33.9%, 30D RV 32.6%, 30D VRP +1.3%".
   - **CONTROLS** dropdown: Lookback **7D/14D/30D/60D** (this seems to set both chart window and the tenor used for IV and RV, since labels change "7D IV / 7D RV / 7D VRP"; at 7D: IV 30.4%, RV 28.4%, VRP +1.9%); Appearance colour swatches (IV, RV, VRP+, VRP-); line thickness 1-4px; IV and RV line shape Line/Step; **Source** (Deribit default; All sources, Derive, Deribit, Binance, Bybit, OKX, Thalex...).
   - Note: the first days of the 30D view show a violent early-window RV spike/dip (RV starts very high then collapses); this is the RV window warming up, not a real signal (inferred).
2. **Vol Risk Premium Table** (source dropdown, default Deribit): Tenor, ATM IV, Parkinson RV, VRP, **Regime** badge. Observed (Deribit): 7D 29.9-30.3% IV / 28.4% RV / +1.5 to +1.9 -> **FAIR**; 14D 31.5-31.8 / 30.9 / +0.7 to +0.9 -> FAIR; 30D 34.0-34.1 / 32.6 / +1.4 -> FAIR; 60D 36.5-36.6 / 33.6 / +2.9-3.0 -> **RICH**. Exact thresholds are not shown; from data FAIR spans about +0.7 to +2 and RICH starts somewhere between +2 and +3; a CHEAP label presumably appears when VRP is zero or negative (inferred).

**How to use**
- VRP positive and large (RICH) = IV is expensive relative to what has actually been happening: premium-selling (covered calls, cash-secured puts, iron condors, short strangles) historically earns; positive VRP in calm markets is normal.
- VRP near zero or negative (CHEAP) = options not paying for realised movement: buying straddles/long gamma has better odds; also a warning that realised vol is catching up (stress).
- Compare tenors: if 60D VRP is rich but 7D is fair, the richness is in the back of the curve (sell far, hold near).
- Always check what RV window means: RV is backward-looking, IV forward-looking; a big upcoming event can justify a "rich" IV.

**Data**: ATM IV by source from the platform's own chains; RV from spot candles (Bybit 1H) via `/api/market/atm-vs-rv`. **Gating**: free. **Bugs**: none seen apart from the warm-up artefact. Note the docs place this panel on the Vol Regime page, but it has its own URL.

---

## 3. /btc/iv-percentile - IV Percentile Search

**Purpose**: Screener that ranks every venue/expiry's ATM IV against its own 90-day history so you can find which instrument is historically cheap/expensive.

**Layout**
- Header text: "ATM implied volatility ranked against its own 90-day history. Select a tenor, filter by expiry and source, then click any column header to sort."
- Filters: **TENOR** select (7D, 14D, 30D, 60D, 90D, 180D), **EXPIRY** select (All Expiries or a single date), **SOURCES** multi-select (All sources or any venue), **PERCENTILE** min/max number inputs (0-100 default) to filter e.g. "only above 90". Row count shown ("140 rows - 7D").
- Table columns: Source (venue badge), Expiry, ATM IV (sortable), Percentile (bar: green low -> red high, number 0-100), Samples (number of historical IV observations; larger = more reliable, e.g. 12,147).
- Observed values at 7D: OKX 2026-08-21 23.4%, 0 percentile; high end 100th e.g. Bybit 2026-08-07 52.3%. 
2. **IV Percentile Bands**: ATM IV (7D) line for the last 30 days (Sep 10 to Oct 10) with dashed lines p75 = 35.4% (red) and p25 = 31.1% (green) and a current-IV line 29.7%; text "p75 / ATM IV now / p25 / 30D bands". Current 29.7% is below p25, i.e. cheap vs last 30 days.
3. **IV Distribution**: box-and-whisker plot of historical ATM IV per tenor (1D, 2D, 3D, 4D, 7D, 14D, 30D, 60D, 90D, 180D) with a yellow line showing current IV per tenor (info icon explains; y-axis 11.9% to 44.7%). Yellow line below the box = cheap, above = expensive. Currently the current line sits at the low end for most tenors.

**How to use**: set tenor to the horizon you trade; sort by Percentile ascending to find cheap options to buy (lowest percentile + lots of samples), descending for rich ones to sell; check across venues to see if one exchange is relatively cheap (also useful to pick where to execute). Guideline from docs: above 80 = expensive (consider selling premium), below 20 = cheap (consider buying).

**Data**: `/api/market/iv-percentile/search`, `/api/market/iv-boxplot`. **Gating**: free.

**BUGS / STALE DATA (important)**: the table is **stale/wrong for today**. Its expiry list and rows contain expiries from 2026-07-17 through 2026-09-25 (all already expired as of 2026-10-10) plus 2026-10-16 only; the 7D row set is dated Aug 2026 (e.g. top 7D row "OKX 2026-08-21"). Today's live expiries (Oct 11-Dec) are absent from the dropdown. The Bands chart and Distribution use current data (they show Oct 10), so only the screener table is stale. Treat the table as unreliable until fixed. Also changing the native tenor select by keyboard seemed flaky in my test.

---

## 4. /btc/vol-index - Vol Index (MBVI)

**Purpose**: A BTC volatility index (like DVOL/VIX) drawn on a full TradingView-style chart. "MBVI" is the site's own index (acronym not spelled out; likely "Model-free BTC Volatility Index" (inferred), computed from option prices; docs mention Deribit's DVOL as the benchmark).

**Shows**: OHLC for the index (e.g. O/H/L/C 38.56, "38.6%", -0.59 (-1.5%) 24h) plus a status badge (observed "NORMAL"; other states presumably LOW/HIGH/ELEVATED (inferred)). Default 15m candles over about 2 weeks; range 36.5 to 41 in the window; a spike up to ~40.7 around Oct 8.

**Controls**: Source dropdown (Deribit default, or Derive; each described as a single-venue index); timeframes 1m, 3m, 5m, 15m, 30m, 1H, 2H, 4H, 1D, 1W, 1M; chart types (C candles, L line, A area), scale N/%/log, indicators EMA 20, EMA 50, BB(20,2), RSI 14; left toolbar drawing tools (cursor, trend line, horizontal line, ray, vertical line, fib/ladder, rectangle) and a magnet toggle. Candles API: `/api/market/mbvi-candles?resolution=15m&source=deribit`, `/api/market/mbvi-index`.

**How to use**: treat MBVI as "the VIX of BTC". Read it as the market's 30-day-ish expected annualised vol: rising index = fear/event risk; falling = complacency. Mean reversion: spikes (like Oct 8) tend to fade; use RSI/BB to spot stretched readings, EMA 20/50 for trend of vol. Use 1D/1W timeframe for regime context, then compare to VRP and term structure.

**Gating**: free. **Bugs/oddities**: a stray vertical line near Sep 28 on the 15m chart (one outlier bar) and some scattered dots around candles (noise ticks).

---

## 5. /btc/vol-regime - Vol Regime

**Status: UNDER CONSTRUCTION.** The page shows only a banner: "Regime Classifier - In Development ... The regime classification model is being rebuilt on real historical data. This page has been taken offline to avoid presenting unverified confidence scores as fact." Checklist (in progress): 5.5-year DVOL backfill (BTC+ETH); HMM/GMM regime classifier on real historical regimes; parquet surface archive across 6 venues; CVSTE surface-tensor encoder planned Q4 2026. "Backend services remain active; panels will return when the model is validated."
- The docs (/btc/docs) still describe a full Vol Regime page (Markov regime timeline, transition matrix, Lorenz regime, DVOL key levels, vol cone, weekly variance) - **these are not live**. For regime-like info today use VRP, IV percentile bands, and Term Structure pages.

---

## 6. /btc/skew - Skew Analytics

**Purpose**: Shows how the market prices downside vs upside risk (skew, smile, risk reversals, wings) across strikes, expiries and time.

**Important sign convention**: this page defines **25D RR = call IV minus put IV**. Negative = puts richer (fear/hedging); positive = calls richer (FOMO/upside demand). (The /btc/docs page defines skew the opposite way, as put minus call; the Tail Strike page also uses put minus call. Be careful when comparing pages.) Chart notes "flat" at 0.

**Panels**
1. **IV Smile**: IV vs strike for the chosen expiry (default 2026-10-13, source "DERIBIT Mark IV"). Observed U-shape: ~21-23% IV near 83k, ~56% at 72k put wing, ~44% at 93k call wing (steeper put wing = downside premium). **Gear = Expiries multi-select** (all live expiries 10-10 to 2027-06-25...), so you can overlay several expiries (URL gets `?expiries=2026-10-13,2026-10-23` and is shareable).
2. **Skew by maturity**: 25D RR vs DTE (1d to 349d). COMPARE: OFF/ON toggle (overlays multiple venues (inferred)). Observed: 1d +2.9% (calls rich), 2-3d about -0.3/-0.5, 6d -2.0, 20d -2.2 (puts rich), 349d -0.7. Hover shows source, DTE and value (e.g. 76d, Deribit, -1.50%).
3. **25D Risk-Reversal History**: lines for 7d, 14d, 30d, 90d constant maturity over about a week, range slider; spans +6% to -6% (calls were richer early Oct 4-5, then flipped negative around Oct 8-9).
4. **Skew - Constant Maturity**: curve today (teal) vs 7d ago and 30d ago (dashed grey), x axis 1d to 349d. Shows today's skew has dropped to negative while a week/month ago was positive at mid-tenors - i.e. demand has rotated toward puts.
5. **Skew vs Spot**: TradingView-style chart: spot price plus skew (histogram/line); selectable Chart type (Line/Candle) and Timeframe (15 min, 30 min, 1 Hour, 4 Hour, 1 Day). Shows correlation badge **rho +0.02** (correlation between spot and skew; near 0 = no relationship at the moment).
6. **Spot-Skew**: scatter of spot price over time coloured by skew: red = put-rich (down to -2.4 vp), white = neutral, blue = call-rich (+2.4 vp). Reading: skew went red as spot fell from ~86.5k to ~81k on Oct 8-9.
7. **Skew Active Maturities**: skew per actual expiry history (+3 to -3 vp), Oct 4-10, currently about -2.4 vp, was +2 vp on Oct 5. COMPARE toggle.
8. **Wing Richness** table (time "06:36 PM"): one row per expiry (0d to 349d) with columns 10dP, 25dP, 35dP, ATM, 35dC, 25dC, 10dC, each cell = IV % and the strike. Example 13d (Oct 23): 10dP 38.0% @76k, 25dP 33.1% @80k, ATM 31.4% @83k, 25dC 31.3% @86k, 10dC 32.6% @90k -> put wing about 6.6 vols over ATM, call wing about 1.2 over. Some cells show n/a for short expiries.

**How to use**
- Negative RR (puts richer) = market paying for downside protection; extremely negative often = capitulation/hedging peak (contrarian bullish), but persistent put richness with falling spot confirms risk-off. Positive RR (calls richer) = upside chase; extremes often precede pullbacks (docs: "extreme negative skew [calls rich in their sign convention] often precedes pullbacks").
- Use "Skew vs Spot": spot rising while skew turns put-rich = smart money hedging the rally (warning); spot falling but skew turning call-rich = dip being bought.
- Use Wing Richness to pick strikes: expensive wings = sell wings/risk reversals (sell rich put, buy cheap call), cheap wings = buy tails.
- Smile with multiple expiries tells you which expiry carries the steepest skew.

**Data**: Deribit as primary (`/api/wings`, `/api/market/iv-smile`, `/api/market/rr-history`); other sources via settings/Compare. **Gating**: free.
**Bugs/oddities**: the 0d row of Wing Richness shows nonsense (10dP 55.2% @94k and 10dC 44.1% @81k = strikes inverted) because the same-day expiry is being settled/illiquid; 1d row has 10dP@81.5k and weird n/a mix. Smile took about 8-10 seconds to appear ("LOADING..."). Panels differ in sign convention from Tail Strike.

---

## 7. /btc/surfaces - Volatility Surface

**Purpose**: The whole implied-vol surface (every delta x every expiry) in 3D or as a 2D heatmap, live or replayed through time.

**Description on page**: "Live surface plots the venue's own quoted IV by delta and expiry: real market data, no model fit. Replay scrubs the SVI-fitted history, and the 2D heatmap stays on log-moneyness. Switch venues to contrast surfaces."

**Controls**
- **Venue picker** (checkbox list; Derive default; all 12 venues; can tick several to contrast (inferred)).
- **LIVE / REPLAY** toggle. REPLAY adds **2H / 24H / 7D** windows, a "1s ago" freshness indicator, and a playback bar (|<< < play > >>|), speed **1x/2x/4x**, a timeline slider and a UTC timestamp (e.g. "Sat, 10 Oct 2026 10:41:56 UTC"). History is SVI-fitted (a smooth model fit), live is raw venue quotes.
- **Heatmap / 3D** toggle. 3D has zoom +, -, reset buttons and can be rotated by dragging. Axes: Deltas (5p ... 20p, 35p, ATM, 35c, 20c, 5c), Expirations (12 Oct ... 24 Sept), Volatility %. Colour red = high IV, blue = low IV.
- Heatmap: x = expiry, y = **log-moneyness** (-40% to +32%), colour = IV (10% blue to 60% red), dashed ATM line.

**Observed (Derive live)**: surface range ~18-60% vol; steep red put wing on short expiries; flat teal/yellow plateau near ~37-40% for far calls and long expiries. Heatmap shows strong red band at about -31% to -40% moneyness and blue strip at the left edge (very short expiry) - these are extrapolation/illiquid regions.

**How to use**: read it as "where is the vol": ridge at the put wing = fear premium; ridge in the front month = event vol; flat surface = calm. Use Replay to see whether the surface has been rising/twisting over the past 2h/24h/7D, e.g. after a sell-off the put wing steepens. Switch venues to see if one exchange quotes different vol (arbitrage hints).

**Data**: per-venue chain data; replay from SVI fits. **Gating**: free. **Bugs/oddities**: heatmap view took about 5-10 seconds to render (blank first); extrapolated extremes can look unrealistic; the 3D canvas gives no text so get_page_text returns almost nothing.

---

## 8. /btc/heatmaps - Heatmap analytics

**Purpose**: Four visual maps of where options activity and dealer exposure concentrate. (Sits in the "Greeks" sidebar group, not Volatility.)

**Panels**
1. **Strike footprint** ("Notional density: 5-min bins"): x = time, y = strike, brightness/colour = traded notional per 5-minute bin. Buttons 1h / 4h / 24h and sources multi-select. Dashed horizontal line = spot. Hover tooltip: "Time: 15:45, Strike: $82,400, no trades (or notional)". Use to see which strikes the flow is hitting over the last hours and whether it is clustering above or below spot.
2. **OI concentration** ("Call + put OI by expiry x strike"): rows strikes (87k-170k visible), columns expiries, colour = open interest (legend up to 30,066K scale i.e. 30.066K contracts? label "30.066K"), brightest around 95k-100k (e.g. 95k yellow). Use for max-pain / pinning and where big strikes sit.
3. **GEX domain map** ("Gamma exposure, arctan brightness"): x = strike (10K to 124K), y = days to expiry (0d to 838.9d, log), green = +GEX (dealers long gamma; dampens moves), red = -GEX (short gamma; amplifies moves); dotted vertical line = spot ($82,906). Observed: red mass below spot (79.6k area), green above (83.5k-93k) in the near-term.
4. **VEX domain map** ("Vanna exposure, arctan brightness"): teal = +VEX, purple = -VEX. Vanna = how dealer delta hedges change when IV changes; teal/purple zones show where a vol move forces dealer buying/selling.
- Each map has a sources dropdown (All sources default) and a camera icon.

**How to use**: Strike footprint = what traders are doing now; OI map = where positioning is; GEX/VEX = how dealers will be forced to behave around those levels. Combine: if price is above a cluster of -GEX zones, moves can accelerate; green GEX zones near spot suggest pinning.

**Data**: all sources aggregated; loads progressively (skeleton bars for the first 6-10 s). **Gating**: free. **Bugs**: slow initial load; the spot line in domain maps ($82,906) differs a little from the header ticker ($82,737) because they use different sources/snapshots (inferred).

---

## 9. /btc/thermography - "Options Exposure Heatmap" (strike x expiry grid)

**Purpose**: A table-heatmap of dealer Greek exposure per strike and expiry, to see where dealer pressure concentrates ("Strike x Expiry Greek exposure"). Sidebar name: Exposure Heatmap (Greeks group).

**Controls**
- **GREEK**: Gamma Exposure / Vanna Exposure / Vega Exposure / Charm Exposure.
- **VIEW**: NET / CALLS / PUTS.
- **PALETTE**: Default / Ice Fire.
- **SOURCE**: dropdown, Deribit default, All sources or any venue (multi-select).
- SPOT readout (82,774.09).

**Content**: grid of 40 strikes x 15 expiries (Oct-10 ... Sep-24-27); each cell is a dollar value (e.g. $45.2M at 90k Oct-30, $39.5M at 95k Oct-30); colour scale blue = **put pressure** to red = **call pressure**; ATM row marked; bottom row "Total" per expiry (e.g. Oct-30 +$95.7M, Dec-25 +$60.8M), and a summary strip: **MAX CONCENTRATION $90,000** (strike with highest |net| exposure), **SKEW DIRECTION: Call Pressure** (net sum +$200.7M across all strikes), **DATA COVERAGE 65.0%** ("600 of 600 cells populated" - internally inconsistent).

**How to use**: find the big red clusters (e.g. 90k-95k Oct-30/Dec-25): call-gamma walls that act like magnets/resistance; big blue/negative clusters below spot (80k, 78k) = put-driven pressure/support-then-acceleration zones. Use Charm to see daily delta decay flows and Vanna to see vol-spike flows. Switch NET vs CALLS vs PUTS to see which side drives the concentration.

**Data**: per-venue option chain OI and Greeks (Deribit default). **Gating**: free. **Bugs**: Data-coverage line contradictory; cells show "$0" for strikes with no listed contract rather than "n/a"; strike spacing is irregular (listed strikes only).

---

## 10. /btc/divergence - Cross-exchange divergence

**Purpose**: Show where exchanges disagree on the same option (IV, USD mark price, gamma) and how fresh each venue's data is; plus a live fee-adjusted arbitrage list. (Sidebar group "Multi Exchange Stats".)

**Panels**
- **Expiry** select: lists expiries with venue coverage counts e.g. "2026-10-13 (7/12)" meaning 7 of 12 venues quote it; "defaults to the cross-source intersection". Only 2026-10-30 (12/12) is fully covered.
- **Freshness**: tile per venue with data age and lag vs the freshest (e.g. Binance 0s freshest, Deribit 1s, OKX 2s, Paradex 14s, Aevo 12s, Bullish 24s, Derive 36s, Bybit 37s, Thalex/Delta/Callput/Hypercall "n/a, no samples"). Header "2026-10-13 - BINANCE freshest". Sources dropdown.
- **IV Disagreement** (bar chart by strike 73K to 93K; y = IV spread in vol points 0-8; bars = call delta-IV and put delta-IV): max-minus-min IV across venues at each strike. Spikes (7.6 vp at 74k; 4.9 at 89k) are wings with thin liquidity; near ATM spreads are about 0.5-1 vp.
- **Basis Spread (USD)**: per strike, difference in USD mark price across venues (-$110 to +$110), call and put bars.
- **Gamma Spread** (RELATIVE - SMILE-FIT GAP): % difference in gamma across venues (0-120%), huge at wings, near 3-5% ATM.
- **Divergence events**: live websocket list; was stuck on "reconnecting..." for me (empty).
- **Arb Scanner** (fee-adjusted IV spread, taker fees included): rows show age (19s, 52s, 1m, 2m), expiry, direction "buy venue -> sell venue" (e.g. DELTA -> THALEX), "1.59 vp - 0.48 = +1.10 vp" (gross spread minus fees = net edge). Observed edges +0.5 to +1.1 vp (Delta->Thalex on 2026-10-30; Derive->Thalex 2027-06-25; Derive->Binance 2027-09-24).

**How to use**: Use Freshness first - ignore spreads where one venue is stale (Derive/Bybit were 36-37s behind). Real disagreement is where both venues are fresh and the spread persists. For a beginner: use it to pick the cheapest venue to buy/sell a given option, and to sanity-check IV prints. Arb opportunities are not risk-free (liquidity, fees, margin, transfer/hedge cost); docs: most IV divergence closes in 30-60 s.

**Data**: `/api/...` plus websocket for events/arb. **Gating**: free (docs claim otherwise). **Bugs**: "reconnecting..." never connects in my session; legacy docs say 5 venues but there are 12; 4 venues have no samples.

---

## 11. /btc/premium - Premium Matrix

**Purpose**: Dollar-value map of options premium sitting in the chain (mark price x open interest) for each strike x expiry, so you see where the money is. ("Where the money actually sits in the chain.")

**Layout**: matrix; rows strikes (nearest 20 to spot, 77,000 to 88,000), columns expiries (10OCT26 0d ... 29DEC28 811d, 20 expiries), cell = dollars (e.g. 80,000 strike on 30OCT26: $28.8M; 27NOV26... Σ row 80,000 = $155.4M, 85,000 = $57.2M; Σ EXP: 30OCT26 = $110.1M, 25DEC26 = $171.3M; grand total $461.1M visible window). ATM row highlighted gold (83,000 ATM). Hover/tap a cell for calls/puts split. Footer: "Nearest 20 strikes to spot shown. Row/column totals sum the visible window, not the full chain. Strike ladder anchored to DERIBIT, the deepest-liquidity source."

**Controls**: Sources (All sources default); metric **STANDING OI / BUY FLOW / SELL FLOW** (flow adds **1H / 4H / 24H** windows - premium bought/sold in that period); side **BOTH / CALLS / PUTS**; **NEAREST 20 / ALL STRIKES**; COLOR (MONO + other palettes); **SCALE: GLOBAL or PER-EXPIRY** normalisation, curve **LINEAR / SQRT / LOG**, intensity boost slider (up to 4.00x), min opacity slider; **BIRD'S EYE** (compact whole-chain overview); **DOWNLOAD TABLE** (CSV-like download; not tried); camera screenshot.

**How to use**: Standing OI mode = where big positions/hedges live (e.g. 80k puts Dec 2026 = $77.6M is the biggest cell, a major hedge/strike). Buy-flow vs sell-flow mode = what was traded recently; large buy flow at a strike signals new demand. Use CALLS/PUTS to see which side holds the premium. Combine with Heatmaps/Exposure Heatmap to compare "money" vs "dealer exposure".

**Data**: Deribit-anchored ladder, other venues merged at matching strikes. **Gating**: free. **Bugs/oddities**: spot in this panel ($82,906) differs from header ($82,737); in Buy Flow mode column labels showed an already-expired 09OCT26 (0d) column (expired day still in flow window); sparse "." cells where no OI.

---

## 12. /btc/tail-strike - Tail Strike Analysis (tail risk / pre-crash signal)

**Purpose**: Simple tail-risk gauge comparing the 10-delta put wing with 25-delta skew to flag a build-up of crash protection. Subtitle: "30-day history of put wing acceleration vs 25D skew. Detects pre-crash tail-risk buildup across options markets." Tagged "VOLATILITY - TAIL RISK ANALYTICS" (sits in the Greeks sidebar group).

**Panels**
1. Header chip showing current signal (observed **Elevated Call Tail**).
2. **Tail Risk** card (10D vs 25D put wing skew, pre-crash signal): sources dropdown (All Sources); state text **HIGH_CALL_TAIL**, a **Flash crash: LOW** chip; gauge from "Call tail" (-3) through 0 to "Put tail" (+3) with score (**-1.54**); tiles: ATM IV (n/a - bug), **25D skew +0.3 vols** (put minus call), **10D skew +1.6 vols**, **Confidence HIGH** (711 historical samples, 72h window); footer "Deribit - spot $82,755".
3. **30-Day Tail Score vs 25D Skew**: toggle **REGIME-NORMALIZED / RAW** chart; two lines (tail-score z-score and raw 25D skew spread; ranges -5..+5 and -6..+18 vols), thresholds legend: >= +1.5 High Put; >= +0.5 Elevated Put; -0.5..+0.5 Normal; <= -0.5 Elevated Call; <= -1.5 High Call (skew in vols, put minus call).
4. **Signal Distribution - last 30 days**: stacked bar: Normal 29% (9d), Elevated 24% (7d), High 11% (3d), Elev. Call 29% (9d), High Call 7% (2d).
5. **Current Snapshot**: Tail score -1.360 (z-score), 25D skew -0.5 vols, Signal Elevated Call Tail, as of Oct 10 6:42 PM, Source DERIBIT BTC, 696 samples, auto-refreshes every 2 min.

**How to use**: positive/high put tail = rising crash-hedging demand beyond normal skew (potential pre-crash/pullback signal, or smart-money hedging); negative/call tail = upside speculation dominates (complacent downside). Treat it as a context indicator, not a timer: persistent put-tail alongside falling spot and negative spot-vol correlation is the pattern to respect. Cross-check with Skew page and Wing Richness.

**Gating**: free. **Bugs/inconsistencies**: ATM IV tile = "n/a"; top card says 25D skew +0.3 vols (all sources, put minus call) but the snapshot lower down says -0.5 (Deribit) and the Skew page shows RR about -2.4 vp (call minus put) at 13d, which would mean puts richer (+2.4 under put-minus-call) - the pages disagree on sign/magnitude; sample counts differ (711 vs 696); score -1.54 vs -1.360 in two cards.

---

## Cross-page caveats worth remembering

1. Skew sign conventions differ: Skew page RR = call minus put (negative = puts rich); Tail Strike and docs = put minus call (positive = puts rich).
2. Docs (/btc/docs) are outdated: five venues vs twelve; describes Vol Regime features that are offline; says Divergence/Arb Scanner need signup but they are open.
3. The IV Percentile screener table uses stale (expired) expiries.
4. Spot values differ slightly between panels (source differences).
5. Everything is "free crypto options analytics" per page titles; no sign-in prompts appeared.

---

## Suggested volatility workflow (order of use)

1. **/btc/vol-index (MBVI)**: one number - is vol high/low/rising/falling right now?
2. **/btc/term (Volatility Anatomy)**: curve shape (contango vs inversion), implied move in dollars per expiry, and percentile rank by tenor -> pick the expiry that fits your view.
3. **/btc/iv-percentile**: confirm cheap/rich vs history (use the Bands and Distribution panels; ignore the stale screener table until fixed).
4. **/btc/iv-rv-vrp**: is IV paid for realised movement? Rich VRP -> favour selling premium; cheap/negative -> favour buying.
5. **/btc/skew** (then **/btc/tail-strike**): who pays for puts vs calls; choose strikes using Wing Richness; check tail-risk build-up.
6. **/btc/surfaces**: visualise the whole surface; replay to see changes over 2h/24h/7D and compare venues.
7. **/btc/heatmaps + /btc/thermography + /btc/premium**: see where money, OI and dealer gamma/vanna sit (levels that may pin or accelerate price) and where recent premium flow is going.
8. **/btc/divergence**: before trading, compare venues - pick the cheapest/fresh venue; look for fee-adjusted spreads. Vol Regime (/btc/vol-regime) is offline for now.
