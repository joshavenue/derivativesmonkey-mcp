# Group C notes: flow, blocks, open interest (BTC)

Site: https://www.derivativesmonkey.com (React SPA, "Derivatives Monkey: Options Analytics", footer "V0.3 / 2026.05").
Browsed 2026-10-10 (UTC, BTC spot about $82.7K). Observations only; anything inferred is marked "(inferred)".

## 0. General facts (apply to all pages here)

- No login, paywall, cookie banner or gating seen on any of these pages. All free and public. The only auth call is `POST /auth/refresh` which returns 401 for anonymous users (harmless). A floating chat bubble appears on the dashboard.
- Nav (left sidebar): FLOW group = Trade Tape, Options Order Flow (`/btc/order-flow`), Volume Flow, Open Interest, Scanner. BLOCK RFQ group = Aggregated, Derive, Deribit, Paradigm (Deribit), Paradigm (Paradex). MULTI EXCHANGE STATS group = Divergence, Lead-Lag, Basis Spread. `/btc/blocks` and `/btc/paradigm-flow` are NOT in the sidebar. They are reachable by URL, and `/btc/blocks` is mentioned in /btc/docs.
- Top bar: asset selector (BTC and others), language, colour palette, live BTC price chip, "Trade Now" button (affiliate link to app.derive.xyz with ref=derivativesmonkey), search (Cmd+K).
- Timestamps are UTC unless stated. Dates like "10 Oct" are UTC.
- Camera icon on charts = screenshot/export of that panel.
- API patterns seen (no scraping done): `/api/rfq/trades?asset=btc&limit=200&source=deribit|derive|paradigm`, `/api/rfq/stats?asset=btc&hours=24`, `/api/rfq/strategy-popularity?asset=btc`, `/api/rfq/{deribit|telegram|paradigm}/health`, `/api/market/market-summary`, `/api/market/term-structure`, `/api/market/chain-latest?source=derive`, `/api/market/expiries-all`. A 404 on `/api/site-notice` is harmless.
- Docs (`/btc/docs`) say the platform aggregates five venues (Derive, Deribit, Binance, Bybit, OKX), but the live site now lists 12 sources: Derive, Deribit, Binance, Bybit, OKX, Thalex, Paradex, Aevo, Delta, Bullish, Callput, Hypercall (docs are out of date). Docs' "Order Flow" section (flow scoreboard, direction volume, whale bubble, cumulative GEX bars) does not match the current `/btc/order-flow` layout (flow map, aggregator, moneyness).

## 1. Beginner glossary (plain English)

- **Option**: a contract giving the right (not the obligation) to buy (call) or sell (put) BTC at a set price (strike) on or before a set date (expiry). Instrument names look like `BTC-30OCT26-82000-P` = BTC, expires 30 Oct 2026, strike $82,000, Put. (Derive uses `BTC-20261030-82000-P`.)
- **Block trade**: a large trade negotiated privately between two parties, then reported to the exchange, instead of being matched on the public order book. Used so a big order does not move the market. Minimum sizes are large (Deribit options block min is on the order of tens of BTC; inferred from observed sizes, not stated on site).
- **RFQ (Request For Quote)**: the way many blocks are made. A trader asks several dealers/market makers "quote me this trade"; dealers reply with prices; the trader accepts the best one. Statuses on the site: FILLED (done), OPEN (still quoting), CANCELED, EXPIRED (nobody traded).
- **Multi-leg / strategy**: one block can contain several options at once (spread, straddle, strangle, iron condor, butterfly, calendar, risk reversal). The site auto-labels these ("Put Spread", "Iron Condor", etc.).
- **Deribit**: the biggest BTC/ETH options exchange. Has a native Block RFQ product (data pulled from Deribit's REST API every 60s).
- **Derive**: on-chain options exchange (formerly Lyra); has its own Block RFQ, surfaced on this site via a Telegram feed. Derive trades are tiny compared with Deribit (about $1.4M per 24h).
- **Paradigm**: an institutional RFQ/block-trading network (a "dealer-to-client" chat/RFQ platform). Paradigm blocks settle on a venue: Deribit (labelled "Paradigm (Deribit)") or Paradex ("Paradigm (Paradex)", PRDX). Paradigm data on this site comes in three flavours: DRFQv2 (Paradigm's RFQ v2 feed), OBv1 (order-book feed), and Telegram (TG).
- **OKX / Binance**: other exchanges whose block trades also appear on the Aggregated page.
- **Aggressor / taker vs maker**: the taker is the side that crosses the spread (buys at the ask, sells at the bid) and initiates the trade; the maker posts the resting quote. "Buyer-initiated" = taker bought (looks bullish for calls); "seller-initiated" = taker sold. On this site BUY/SELL (and filled vs outlined bubbles) is the taker's direction (docs say "BUY or SELL from the taker's perspective").
- **Open interest (OI)**: number of option contracts currently open (not yet closed/expired). Volume resets each day; OI accumulates. Rising OI + volume = new positions; volume with flat/falling OI = trades closing old positions.
- **Notional**: contract size times BTC price in USD. **Premium**: actual price paid for the option.
- **Max pain**: strike at which option buyers collectively lose the most at expiry (sellers gain the most). Shown as a vertical line on the OI chart.
- **Delta (Δ)**: how much the option price moves per $1 BTC move (call 0 to +1, put 0 to -1). Net delta of a block tells whether it is net long or short BTC exposure. Other greeks on scanner: Gamma (Γ), Theta (θ, time decay), Vega (sensitivity to IV).
- **IV (implied vol)**: the volatility the option price implies. "vp" = vol points.
- **ITM/ATM/OTM**: in/at/out of the money.
- **Spread vs strategy names**: bull call spread = buy lower call, sell higher call; put spread, straddle (same-strike call+put), strangle (different-strike call+put), iron condor (short strangle + long wings; profits if price stays in a range), calendar (same strike, two expiries), ratio spread, butterfly, risk reversal (call vs put, skew bet).

## 2. /btc/blocks  ("Block RFQ Trades")

Page title: "BTC Block Trades". Not in the sidebar. The older, all-in-one "blocks" tape (the docs call it "Blocks page"/"/blocks").
**Purpose**: single page that lists raw block RFQ trades from three feeds (Deribit REST, Derive Telegram, Paradigm Telegram) with headline stats and a positioning/flow lean.

**Header stats** (24H window default): BLOCKS 24H = 156, OPEN = 0, NOTIONAL 24H = $191.14M.
- WINDOW buttons: 6H / 24H / 3D / 7D / 30D (change the stats and lean meters).
- **Positioning Lean** meter, e.g. "BULLISH LEAN, 53% bullish / 47% bearish" and **Flow Lean** meter, e.g. "NET BUY, 70% bought / 30% sold". Positioning lean = share of notional that is bullish structures vs bearish structures; Flow lean = share of legs/notional bought vs sold (inferred definitions; the page does not define them).

**View tabs**: ALL | DERIBIT | DERIVE | PARADIGM | STRATEGY, plus a note "LAST 14D / LAST 14D LEGS" (a legend/label, not a button).
- ALL = three stacked tables (Deribit, Derive, Paradigm).
  - Deribit Block RFQ table ("REST · 60s", LIVE): columns TIME (UTC), STATUS (FILLED/OPEN/CANCELED/EXPIRED chips), LEGS, NOTIONAL (signed, e.g. +$4.13M), ENTRY (net entry price in BTC, e.g. 0.00502; "n/a" for some complex structures). Each leg shows a direction arrow (green up = BUY, red down = SELL), size in BTC, instrument and fill price in BTC (e.g. `▼ 25 BTC-25DEC26-72000-P @ 0.0193`, `▲ 25 BTC-25DEC26-74000-P @ 0.0245` = sold the 72K put, bought the 74K put, a put spread). Status filter chips (ALL/FILLED/OPEN/CANCELED/EXPIRED) on each table.
  - Derive Block RFQ table ("Telegram · live"): TIME, STATUS, ASSET, LEGS (size and instrument; no prices; sizes are BTC, e.g. 0.08, 20, 0.9). Same status chips.
  - Paradigm Block RFQ table ("Telegram · institutional"): showed "No Paradigm trades in the last 14 days" => the Paradigm Telegram feed is dead/stale here (empty state; the newer Paradigm page shows live data instead).
  - Rows did not expand on click (no detail drawer).
- STRATEGY tab: "Strategy Flow" (treemap/chart of strategy types ranked by count; it rendered blank in my screenshot while the text labels such as UNKNO, LONG, BULL... existed in the DOM => likely a render glitch at small viewport) and "Strategy Breakdown" table (COUNT, %, NOTIONAL) with SOURCE filter (All Sources / Deribit / Derive / Paradigm). Values are all-time-ish, not 24H: "98,914 filled trades", Unknown 18,233 (18.4%), Long Call 13,079 (13.2%, $74.01B), Bull Call Spread 10,058, Long Put 9,041, Bear Put Spread 6,819, Strangle 3,942, Straddle 3,819, Iron Condor 757 ... Notionals in the $ billions are not credible for 24H, they look like cumulative history (possibly inflated or double counted) (inferred). Treat the STRATEGY tab as "which structures are popular historically", not today's flow.

**Observed 24h example**: lots of ~$4-8M put spreads and straddles/strangles at 82K/84K (Oct 23/30 expiries) on Deribit; a $234.5M 5-leg put structure on 8 Oct 16:58 (500/700 BTC legs) and a $196.8M 6-leg on 8 Oct 13:41 (outliers); 15-minute repeating small iron condors on 11OCT26 (algorithmic-looking, inferred).

**How to use**: pick window; check Flow Lean + Positioning Lean for the headline; scan Deribit table for the biggest/most recent FILLED prints; use the leg arrows to work out the structure and who is buying vs selling. Filter to FILLED only (OPEN/CANCELED/EXPIRED are quotes that did not trade).
**Caveats**: Deribit notional here = sum of all legs (a 25 BTC put spread shows $4.13M), whereas the Aggregated page shows $2.1M for the same trade (single leg size). Don't compare notionals across the two pages without noting this (inferred from 25 BTC x $82.7K = $2.07M per leg).
**Gating**: none.

## 3. /btc/block-rfq/aggregated  ("Block RFQ: Aggregated")

**Purpose**: the main modern block page: every block from all venues merged into one tape plus analytics. Subtitle: "Deribit · Derive · OKX · Binance · Paradigm · 24H".
**Top badges**: 156 Blocks, $191.1M Notional (24H).
**Two tabs**: TRADE TAPE | ANALYTICS.

**Trade Tape tab**
- Filters: STATUS (All / Filled), WINDOW (24H / 3D / 7D / 30D), STRATEGY dropdown (ALL STRATEGIES + each detected structure), trade count on right ("156 trades").
- "BLOCK TRADE TAPE, ALL SOURCES, 156 prints" table, paged 25 per page (Prev/Next). Columns: TIME (sortable, default newest first), STRATEGY (colour chip: teal = bullish-leaning, red = bearish-leaning, e.g. CALL SPREAD teal, PUT red), LEGS (compact: `+81500P / -82500P` = bought the 81.5K put, sold the 82.5K put; `+2` means 2 more legs), SIZE (USD notional with a bar relative to the page's largest), SOURCE (Derive, OKX, Deribit, Paradigm (Paradex), Paradigm (Deribit), Binance), PREMIUM (net premium in USD, signed; negative = taker paid net debit, positive = received net credit (inferred)).
- Click a row: expands in place showing each LEG (BUY/SELL x size, strike, type, expiry), then a "PAYOFF AT EXPIRY" panel at the bottom of the page (see Derive example: spot at entry, breakevens, entry cost, max risk, max return).
- Example prints seen: Derive call spread +65000C/-200000C $7K; OKX put spread +81500P/-82500P $414K repeated 4 times within a minute (probably one order split, inferred); Deribit put spreads $2.1M; Deribit call calendar $1.2M.

**Analytics tab**
1. NOTIONAL FLOW SURFACE (strike x expiry heatmap; legend Call Buy / Call Sell / Put Buy / Put Sell; current spot strike marked with a pointer, e.g. 83.5K).
2. STRIKE CHAIN: call vs put notional for the top 20 strikes with an EXPIRY dropdown; stacked bars by Call Buy/Call Sell/Put Buy/Put Sell. Example: 82K strike $35.8M is the biggest, then 85K $18.4M, 90K $17.9M, 84K $17.3M.
3. INTERVAL MAP: hour x strike heatmap of call vs put blocks with spot price line overlay.
4. STRATEGY ANALYTICS: breakdown table (count, %, notional): Iron Condor 27 (17.3%), Long Call 25, Bull Put Spread 22, Long Put 19, Straddle 12 ...; donut (24h/3D/7D, Count vs Notional toggle); 24H SUMMARY (Total/Filled/Open/Canceled/Expired/Notional).
5. WHALE BLOCKS: top 20 by notional (e.g. $12.5M single put via Paradigm (Deribit); $12.3M guts strangle on Deribit; $8.3M calls).
6. LEG STRUCTURE: breakdown by leg count (1 leg 31%, 2 legs 44%, 3 legs 5%, 4+ 19%) and by option type (All calls 27%, All puts 38%, Mixed 33%).
**Gating**: none.

## 4. /btc/block-rfq/derive , /deribit , /paradigm-deribit , /paradigm-paradex (the "4 block-rfq views" plus aggregated)

All four share the same template as Aggregated (tabs BLOCK RFQ TAPE | ANALYTICS; STATUS All/Filled; WINDOW 24H/3D/7D/30D; STRATEGY dropdown; tape without the SOURCE column since it is a single venue; payoff panel), just filtered to one source. Differences:
- **Derive** (`/btc/block-rfq/derive`): subtitle "Derive · BTC · 24H"; 19 blocks, $1.4M notional (tiny retail-size blocks, 0.0075 to 100 BTC, mostly under $250K). Derive prints have fractional-BTC sizes and no obvious institutional structure. Premium numbers are tiny (e.g. -$304). Analytics adds a CUMULATIVE FLOW chart (Call/Put x Buy/Sell cumulative over 24H/3D/7D/14D; CALL PEAK $1.5M, PUT PEAK $817K, NET PREMIUM $724K). Has the same strike-chain/flow-surface/whale/leg-structure sections. Source feed is Telegram (so no exchange price; premium is derived/estimated, inferred).
- **Deribit** (`/btc/block-rfq/deribit`): "Deribit · BTC · 24H"; 29 blocks, $91.8M. Native Deribit Block RFQ (REST). Big plain structures: 25 to 150 BTC put spreads, straddles, strangles, a $12.3M guts strangle, repeating 15-minute small iron condors (11OCT26 expiry). Same analytics set including Cumulative Flow (CALL PEAK/PUT PEAK/NET PREMIUM).
- **Paradigm (Deribit)** (`/btc/block-rfq/paradigm-deribit`, title "BTC Block RFQ: Paradigm Deribit"): 32 blocks, $83.3M (24h). Blocks negotiated through Paradigm and printed on Deribit. They are typically the biggest (e.g. $8.3M calls, $8.3M 87K/97K call spreads, $4.1M put spread). Appears to be deduplicated against the Deribit page (Paradigm-routed prints show only here), (inferred).
- **Paradigm (Paradex)** (`/btc/block-rfq/paradigm-paradex`): not opened in detail; in the Aggregated tape it shows many very small prints ($83 to $8K), so it behaves like retail-size testing flow, not whale blocks.
- **Aggregated** = union of all of the above plus OKX and Binance.
- **/btc/block-rfq/paradigm** (the URL in my brief): different layout: the rich "Paradigm" page, see section 5.

How to choose: want size and institutions => Deribit + Paradigm (Deribit); want smallest-ticket/on-chain/retail activity => Derive; want everything and the heatmaps => Aggregated.

## 5. /btc/block-rfq/paradigm  ("Block RFQ / Paradigm") and /btc/paradigm-flow

**Purpose**: deep dive into Paradigm institutional flow with buy/sell direction and delta (unlike the other pages which only show leg arrows).
**Header cards (24H, with 24h/3D/7D toggle)**: BLOCKS 24H 75; NET BUY $112.07M; NET SELL $72.40M; CALL BIAS 57%; NOTIONAL 24H $87.68M. (Inconsistent: net buy+net sell greater than notional, and the Analytics tab shows Buy $74.5M / Sell $141.8M / Net -$67.3M over a different window. Treat these header numbers with caution.)
**Tabs**: Flow Map | Block Flow | TG Feed | TG Analysis | Analytics | Insights.
- **Flow Map**: bubble chart of Paradigm blocks over time against price line (filter chips Calls / Puts / Mixed; filled = buy, hollow = sell, grey dot = unknown direction; bubble size = notional). "122 / 122 blocks". Data: "Paradigm DRFQv2 · OBv1 · Telegram · spot bybit".
- **Block Flow**: same content as the standalone `/btc/paradigm-flow` page (see below).
- **TG Feed**: the Telegram Paradigm table; shows "No Paradigm trades in the last 14 days" (empty state; the Telegram source is stale).
- **TG Analysis**: long analytics scroll (bubble flow map, daily notional bars by strategy, strike heatmap, rolling buy/sell balance, institutional IV surface, vol smile by expiry, time-of-day heatmap, block size distribution "Median block about $754K, 99th pct about $9.4M", strategy popularity over time, Big Block Monitor with min size $10M and a Telegram alert handle, IV Extreme Trades, Strike Cluster Alert (3+ institutions at same strike inside 2h), Smart Tape full search with strategy chips). All of it is based on the stale Telegram dataset: last records are dated 19 Jul with spot about $65K and most charts say "No data for this window" => stale/legacy. Ignore for current analysis.
- **Analytics** (live): NOTIONAL 24H, BUY NOTIONAL, SELL NOTIONAL; strategy breakdown (Multi-leg 189, Put 84, Call 48 of 321 filled trades); BLOCKS 5,394 (+3,088 open), TOTAL NOTIONAL $43.52B avg $8.1M (last 90 days, looks inflated), TOP STRATEGY CL Long Call, NET Δ -269, BUY% 57, VENUE SPLIT 55% Deribit / 45% PRDX, BULL/BEAR 57/43. "Paradigm strategy codes" table (CM combo, CL long call, CS call spread, CC call calendar, PT long put, CB call butterfly, PC put calendar, PS put spread, VL, SD straddle, CD, CR call ratio, SG seagull, PR put ratio, VD, VT, IP, PB, FF, IB, FD, IC iron condor, PD, VF, FT, FS) with blocks, notional, net delta and "lean" (e.g. CL 1,723 blocks $7.43B, 58% bull). Venue breakdown: Deribit avg size $14.7M, PRDX avg $110K, BLSH avg $2.2M. Intraday block flow by hour (UTC); Buy vs Sell Pressure chart (1H/4H/24H/7D toggle; source toggle All/TG only/DRFQv2 only/OBv1 only; teal above zero = buy, red below = sell, bar colours = calls blue, puts gold, mixed grey); "Delta at which blocks trade" scatter; strike x expiry concentration.
- **Insights**: Top blocks by notional (e.g. #1 $12.5M PT put 16OCT26-76000 -8.66 net delta bearish; call buys 23OCT26-85000 $8.3M +35 delta bullish; 27NOV26 87K/97K call spread +24.7 delta), Strategy Rotation Heatmap (30d, Directional / Vol / Spread / Complex), Net Delta Positioning Tape (168h; "Net Δ: -174.06 BTC"), Strike Ladder / OI Build Map (720h).

**/btc/paradigm-flow ("Paradigm Flow")**: stand-alone Block Flow view.
- Cards: Trades (24h) 75; Net Flow $39.7M; Notional (24h) $87.7M; Top Strategy; C/P Split 57% C.
- Source chips: All / DRFQv2 / Telegram / OBv1. Strategy-code chips (CL 56, PT 55, SD 20, VD 17, CS 9, SG 7, CM 7, PS 5, CR 5, PC 5, CB 4, CC 3, VT 3, PR 2, IC 1, IP 1) filter the list; counts are the last 24h.
- View toggle Cards | Ledger. Ledger columns: Time ("2h ago"), Strategy (code + name), Side (BUY/SELL), Legs (size in BTC, instrument, per-leg delta, e.g. `0.08 11OCT26-83000-P D-0.64`), Net D (net delta of the whole structure), Mark (price, USD), Src (DRFQv2 etc.). "Cards" view adds Index price at fill and venue (PRDX). Page footer "Updated 6:39 PM". Pagination 25 rows/page of 200.
- Right panel: Strategy | Delta Flow | Volume | 4.7yr ranking bars. **Bug**: every ranking row, and "Top Strategy", read "Unclassified (18233)" => strategy-code to label mapping fails; the "4.7yr" tab labelling is also unclear.
- Practical: the latest rows are almost all tiny Paradex (PRDX) prints (0.001 to 0.1 BTC), so the 24h count (75) is dominated by retail-size trades; big Deribit-settled Paradigm blocks are fewer. Use the SELL/BUY side and Net D to read direction (BUY on a put = Net D negative = bearish; BUY on a call = positive).

**Gating**: none.

## 6. /btc/open-interest  ("Open Interest")

**Purpose**: "Positioning at rest": where open contracts sit by strike and expiry across the selected venues. Charts (all with a camera export icon):
1. **OI by Strike**: bar chart of OI at each strike (calls blue, puts amber) with overlays. Controls: SOURCE multi-select dropdown (ALL SOURCES or any of Derive, Deribit, Binance, Bybit, OKX, Thalex, Paradex, Aevo, Delta, Bullish, Callput, Hypercall), EXPIRY dropdown (all or one expiry), "Contract" toggle (units contracts vs BTC/USD, inferred), C / C+P / P toggle, and overlay toggles Intrinsic (white line, total intrinsic value $, right axis up to $100M), Market Value (calls/puts MV lines in $), Avg Premium. Dashed vertical lines mark **Max Pain** (about 80K on All Sources) and **Spot**. Note: Spot label on the chart varied by source (83.77K on All, 83.94K on Deribit) vs the top-bar index $82.7K (different index/mark time; inconsistent).
2. **OI by Expiry**: stacked bars per expiry (10OCT26 ... 24SEP27, DEC27, JAN28 ...), C / C+P / P toggle, "GROUP FAR-DATED EXPIRIES" switch. Biggest: 30OCT26 and 25DEC26 (115.9K axis max).
3. **Open Interest Heatmap**: strike x time with spot price line overlaid.
4. **OI Concentration by Expiry**: strike x expiry density map (colour = OI, scale 8 to 30K).
5. **Fresh Positioning**: 24h volume / OI per strike, windows 24h/3D/7D; ratio >= 1x is flagged "Fresh" (teal) and below as "Normal" (white). Tooltip e.g. "Strike 84.4K ratio 4.12x" = today's volume is 4x the OI at that strike, meaning new positions opened (inferred).
6. **Historical OI Change by Expiry**: OI delta per expiry, Total or Calls/Puts toggle, lookback configurable via gear.
7. **0DTE Distribution** (1D/2D/3D/7D): table DTE, Expiry, Call OI, Put OI, Volume, Avg Call IV, Avg Put IV, Strikes (e.g. 0DTE 2026-10-10 Call OI 3.1K, Put OI 2.6K, volume 39.0K, call IV 51.8%, put IV 38.7%; 1d 4.8K/6.8K OI) plus "OI by Strike (ATM +-20%)" bars for near expiries (gamma event risk).
**How to read**: tall OI at a strike = likely magnet/pin and where dealers have hedges; compare call vs put height to see walls (resistance above spot = call wall, support below = put wall); max pain vs spot = where expiry pinning may pull price; use Fresh Positioning to spot newly opened strikes today; use Historical OI Change to see which expiries are being built (rising) or closed.
**Data**: multi-venue chain snapshots (`/api/market/chain-latest`). **Gating**: none.

## 7. /btc/volume-flow  ("Volume Flow")

**Purpose**: where the last 24h of contract volume landed. Subtitle also says "net premium flow" but I saw no premium-flow chart, only the three volume charts (possible stale copy).
- **Volume by Strike**: bar chart of volume per strike (contracts; example peak at 78K about 1.9K, 76K about 1K), with a zoom slider/minimap at the bottom.
- **Volume by Expiry**: bars per expiry (biggest near-term: 9/10/11OCT26 around 48K axis).
- **Volume by Strike x Expiry**: interactive 3D bar chart (drag to rotate, +/-/reset buttons, zoom icon), colour scale blue (0) to red (max, 504).
- Each chart has a gear: LOOKBACK 1H / 4H / 24H (default) / 7D / 30D and SOURCES multi-select (All or any of the 12 venues; Callput greyed out "N/A"). Screenshot icon.
**Use**: find the strikes/expiries where activity concentrates; combine with Open Interest page (volume >> OI = fresh). No direction (buy vs sell) here: for direction go to Options Order Flow or block pages.
**Gating**: none.

## 8. /btc/order-flow  ("Options Order Flow") vs /btc/orderflow-v2

**/btc/order-flow**: where fills land, whether takers are net buying calls or puts and how much premium is behind each.
1. **Flow map**: scatter of option fills over time (x axis dates 4 to 10 Oct, y axis strike/price, spot label e.g. $82,811) where size = notional, teal = call, red = put, **filled marker = taker buy, outlined = taker sell**. Counter "2273 / 22757" = shown vs total fills (display is capped/sampled). Gear: LOOKBACK 7D / 14D / 30D / MAX and SOURCES multi-select.
2. **Options Flow Aggregator** ("premium-weighted buy/sell flow", toggle 1H / 4H / 24H, source filter): Call Flow $17.48M, Put Flow $14.86M, Net Flow +$2.62M, C/P Ratio 1.18x, Flow Ratio 1.04x. "Positioning, premium-weighted": Calls Bought $8.96M (bullish speculation), Calls Sold $8.52M (upside cap/income), Puts Bought $7.36M (bearish speculation/hedge), Puts Sold $7.51M (floor-setting). Flow by Expiry bar chart. **Top Trades** table: time, instrument, C/P, Dir (buy/sell), Size (contracts), Premium ($), IV (e.g. 20:04 BTC-30OCT26-84000-P put buy 150, $508K premium, 33.2% IV).
3. **Moneyness Flow**: premium by distance of strike from spot (Far Below >20%, Below 5-20%, Near-the-Money within 5%, Above 5-20%, Far Above >20%) x Calls Bought / Calls Sold / Puts Bought / Puts Sold; 1H/4H/24H toggle. Example: near-the-money calls bought $4.3M vs sold $3.0M, puts bought $4.1M vs sold $2.4M.
**Data**: trades from all connected venues (not just blocks), which is why sizes include Derive-style fractional/unusual entries such as `BTC-20261225-145000-P` sell 3.6 with IV "n/a" (Derive-format instrument names, no IV).

**/btc/orderflow-v2**: redirects to `/btc/dashboard` (BTC Options Dashboard: overview cards, market summary, options chain). No v2 order-flow page is live; it is a dead/hidden route. So order-flow vs orderflow-v2 = order-flow is the only working page.

**Gating**: none.

## 9. /btc/lead-lag  ("Lead-Lag Matrix")

**Purpose**: which exchange's BTC price moves first. Cross-correlation of spot/mid price moves across venues at lag offsets of 1s, 5s and 15s over a rolling window ("window 300s, samples <= 233").
- **Pair snapshot**: cards of the best-lag correlation for each directed pair "A -> B r +0.92, lag 1s, 77 samples" (e.g. Delta->Paradex +1.00, Bybit->Binance +0.94, Binance->Hypercall +0.94, Deribit->Thalex +0.92).
- **Lead-Lag Matrix**: three 12x12 grids (LAG 1S, 5S, 15S; "A leads B": row A, column B, value = correlation of A's move now with B's move after that lag; "." = no data, n/a = same venue; Aevo, Bullish, Callput have no data). Source dropdown "All Sources"; timestamp "1.1s ago".
- **Rolling correlation (1H)**: time series for any pair; LAG buttons 1s/5s/15s and a pair picker.
**How to read**: if A->B correlation is higher than B->A at the same lag, A tends to move first. Differences are small here (e.g. Bybit->Binance 0.94 vs Binance->Bybit 0.85; Deribit->Thalex 0.92 vs Thalex->Deribit 0.89). Delta shows negative correlations (-0.4 to -0.7) and only about 30 samples, likely thin/stale data. Treat sample counts (30 to 230) and the 5-minute window as noisy: correlations are mostly "everyone moves together" and do not prove causality (inferred caveat). Useful mainly for latency/arbitrage thinking, not for directional trades.
**Gating**: none.

## 10. /btc/scanner  ("Option scanner")

**Purpose**: cross-exchange option screener; "filter by OI, IV, delta, type, expiry, and source. Click any row to inspect all greeks."
**Left FILTERS panel** (collapsible): TABLE SOURCE (SINGLE: one of 12 venues, default Deribit; "+ Compare sources" to put several side by side), TYPE (Both/Call/Put), MARK IV RANGE %, BID IV RANGE %, ASK IV RANGE % (0 to 300), EXPIRY dropdown, ADVANCED RANGES (more numeric ranges), COLUMNS checkboxes (always: Instrument, Expiry/Strike/Type, Mark/Mark IV, OI/Source; optional: Δ, Γ, θ, Vega, Premium, Bid IV, Ask IV), RESET.
**Top**: CHART SOURCE chips + TF (5m, 15m, 30m, 1h, 4h) + Compare; TOP MOVERS 5M scroller (percentage price change of instruments). **Bug/oddity**: top movers listed SOL_USDC, XRP_USDC, AVAX_USDC, HYPE_USDC and ETH instruments although the asset is BTC (cross-asset leak).
**Expiries strip**: each expiry with DTE and OI (e.g. 11OCT26 1d OI 3.3K; 30OCT26 20d OI 140.8K; 25DEC26 76d OI 126.3K).
**Table**: "938 / 938 rows across 1 source", GROUP NONE/EXPIRY/EXCHANGE; columns INSTRUMENT, EXPIRY, STRIKE, TYPE, MARK (BTC and USD), MARK IV, Δ, PREMIUM, OI (sorted descending), SOURCE, PRED (a "pred" value per expiry such as 0.53 / 0.30; undefined on page, perhaps a predicted/probability metric (inferred)). Legend: call/put row border only, brighter row = ITM, IV cell heat = higher IV.
Clicking a row opens a detail card (mark $141 / 0.0017 BTC, IV 34.6%, strike, OI 25,030, delta 0.0514, gamma 0.000020, theta -17.78, vega 20.44) with "Full page ->" link and a candlestick chart of the option's price (5m candles, "Show IV" and "Show OI" toggles) for the chosen chart source.
Example top OI rows (Deribit): BTC-30OCT26-95000-C OI 25,030; 30OCT26-90000-C 15,158; 30OCT26-100000-C 14,562; 25DEC26-80000-C 8,639.
**Use**: find the biggest OI contracts, compare the same instrument's IV across venues (Compare sources), filter liquid ATM contracts by delta/IV, check greeks before entering a trade. **Gating**: none.

## 11. Differences between similar pages (summary)

- `/btc/blocks` = older, three feeds side by side (Deribit REST, Derive Telegram, Paradigm Telegram, which is empty), with lean meters and an all-time strategy table.
- `/btc/block-rfq/aggregated` = newest merged view with 6 sources (Deribit, Derive, OKX, Binance, Paradigm x2), tape + analytics.
- `/btc/block-rfq/derive|deribit|paradigm-deribit|paradigm-paradex` = same template, one venue each.
- `/btc/block-rfq/paradigm` = the data-rich Paradigm hub (direction, delta, venues) with a stale Telegram-only half. `/btc/paradigm-flow` = just its Block Flow ledger.
- `/btc/order-flow` = trades-based flow (all trades, buy/sell, premium by moneyness) versus block pages (negotiated blocks only). `/btc/orderflow-v2` redirects to the dashboard.
- `/btc/volume-flow` = how much traded (no side); `/btc/open-interest` = what is still open; `/btc/order-flow` = which side and how much premium.

## 12. Bugs, stale data, empty states (consolidated)

1. `/btc/blocks` Paradigm table: "No Paradigm trades in the last 14 days" (stale Telegram feed), same on the Paradigm TG Feed/TG Analysis tabs (data ends 19 Jul).
2. `/btc/blocks` Strategy Flow chart rendered blank at 800x600 while labels exist in the DOM; strategy notionals ($74B for Long Call) implausible.
3. `/btc/paradigm-flow` strategy ranking labels all "Unclassified (18233)"; headline cards inconsistent between pages (Net Flow $39.7M vs Net Buy $112M / Net Sell $72M vs Buy $74.5M / Sell $141.8M).
4. Paradigm Analytics "Total notional $43.52B, 5,394 blocks (+3,088 open)" looks inflated/cumulative.
5. `/btc/orderflow-v2` redirects to dashboard.
6. Scanner Top Movers shows non-BTC instruments.
7. Volume Flow subtitle claims "net premium flow" that is not displayed.
8. Spot price shown on OI chart differs from the top-bar BTC price and across sources.
9. Docs list only 5 venues and an older Order Flow layout (docs outdated).
10. Lead-lag: Delta venue shows negative/thin correlations; Aevo/Bullish/Callput blank.

## 13. Flow-reading workflow (practical, beginner-friendly)

1. **Start with the headline** on `/btc/block-rfq/aggregated` (24H): block count, notional, and which sources dominate. Big days are driven by a few Deribit / Paradigm (Deribit) prints.
2. **Read the tape**: sort by size, look at LEGS. `+` = bought, `-` = sold (taker's side). Name the structure (put spread = defined-risk bearish/hedge; straddle/strangle = long volatility; iron condor/short strangle = selling volatility/range bet; call calendar = term-structure bet).
3. **Judge direction**: buying calls or call spreads = bullish; buying puts/put spreads = hedging or bearish; selling puts = bullish/income. Use the colour chip (teal/red) and, on the Paradigm pages, the Net D (net delta) column and BUY/SELL side.
4. **Find the levels**: Analytics tab, Strike Chain and Flow Surface show which strikes/expiries the money is concentrated in (e.g. 82K, 83K, 84K, 85K for 23/30 Oct this week).
5. **Check whales**: Whale Blocks table, then open the payoff panel (click row) to see breakevens, max risk and max return for that exact trade.
6. **Cross-check with all-trade flow** on `/btc/order-flow`: Flow Aggregator (calls bought vs puts bought, net premium), Moneyness Flow (near-the-money vs wings), Top Trades with IV.
7. **Is it new?** Use `/btc/volume-flow` (where volume landed) and `/btc/open-interest` Fresh Positioning (24h volume/OI >= 1x) plus Historical OI Change to confirm that the flow opened new positions rather than closed old ones.
8. **Map the walls**: on Open Interest, note call/put OI peaks, max pain and 0DTE table to see where dealer hedging/pinning might occur into expiry.
9. **Pick a contract**: in `/btc/scanner`, filter by expiry, type and IV; sort by OI; compare venues; click the row for greeks and price chart before trading.
10. **Sanity-check**: repeated identical prints (15-minute iron condors, 4x identical OKX put spreads) are probably one algorithm/order split; do not read them as 4 separate conviction trades. Remember notional definitions differ (sum of all legs on `/btc/blocks` vs largest-leg on Aggregated) and some feeds are stale (Paradigm Telegram).
