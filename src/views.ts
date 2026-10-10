/**
 * Tool -> view -> endpoint map. This is the curated layer over src/endpoints.json
 * (the live-verified API catalog): each domain tool exposes a `view` enum, and
 * each view names one Derivatives Monkey endpoint plus the caveats an agent
 * must know (units, sign conventions, stale feeds, heavy payloads).
 *
 * Parameter lists and descriptions come from the catalog, so adding an endpoint
 * is one line here. `npm run smoke` calls every view once against the live site.
 */

export type View = {
  path: string;
  method?: "GET" | "POST";
  /** One-line override of the catalog description. */
  desc?: string;
  /** Shown in the tool description and returned in every result as `notes`. */
  caveat?: string;
  /** Signed-in only (401 "Missing token" when signed out). */
  auth?: boolean;
  /** Params sent when the caller gives none (e.g. a single venue for multi-MB endpoints). */
  defaults?: Record<string, string | number | boolean>;
  /** Default `sources` to the asset's default venue instead of "all venues" (payload size). */
  narrowSources?: boolean;
  /** Send the asset's default venue as `source` when none is given (instrument names are venue-specific). */
  defaultSource?: boolean;
  /** Drop rows whose `instrument` belongs to another underlying (upstream returns mixed assets). */
  filterAsset?: boolean;
  /** Longer cache for slow-moving data. */
  slow?: boolean;
  /** Site page (after /{asset}/) where the same data is shown, for citations. */
  page?: string;
  /** Only these assets are supported upstream (others fail fast with a clear message). */
  assets?: string[];
  /** Skip in the smoke run (needs ids from another call, or is a compute POST). */
  smokeSkip?: boolean;
};

export type ToolSpec = { name: string; title: string; intro: string; views: Record<string, View> };

const IV_PCT = "IV values are percent points (45.2 = 45.2%).";

export const TOOLS: ToolSpec[] = [
  {
    name: "dm_markets",
    title: "Assets, venues, expiries, spot",
    intro: "Start here: which underlyings and venues exist, valid expiries, spot prices and the dashboard headline numbers.",
    views: {
      assets: { path: "/api/market/sources-all", desc: "Every underlying (crypto + equities/ETFs via thetadata) with its option venues and default venue.", slow: true },
      expiries: { path: "/api/market/expiries", desc: "Listed expiries (YYYY-MM-DD) for one venue (`source`).", slow: true },
      expiries_all: { path: "/api/market/expiries-all", desc: "Expiries across all venues for the asset.", slow: true },
      expiries_classified: { path: "/api/market/expiries-classified", desc: "Expiries tagged daily/weekly/monthly/quarterly.", slow: true },
      venue_status: { path: "/api/sources", desc: "Live feed status of each venue connector.", page: "sources" },
      venue_uptime: { path: "/api/health/sources/history", auth: true, desc: "Per-venue feed uptime over `hours` (signed in; ~200 KB for 24 h, use small hours).", defaults: { hours: 6 }, page: "sources" },
      spot: { path: "/api/market/spot", desc: "Spot/index price per venue for the asset.", page: "spot" },
      market_summary: { path: "/api/market/market-summary", desc: "Headline card: spot, ATM IV 7d/30d, term spread, net gamma regime, total OI, put/call, call_wall and put_wall (strike+OI), top expiry.", page: "stats" },
      dashboard_init: { path: "/api/market/dashboard-init", desc: "Venues, expiries per venue and the front-month expiry (ATM IV, total OI).", page: "dashboard" },
    },
  },
  {
    name: "dm_chain",
    title: "Option chain and per-strike detail",
    intro: "Option chain rows (marks, IV, greeks, OI) per venue/expiry, cross-venue chain, one instrument's history, and the Strike Insight drill-down.",
    views: {
      chain: { path: "/api/market/chain", desc: "Chain for one venue + expiry: per strike call/put mark, IV, greeks, OI.", caveat: `${IV_PCT} Deribit/OKX BTC/ETH option prices are in coin (0.0021 BTC), not USD.`, page: "dashboard" },
      aggregate_chain: { path: "/api/market/aggregate/chain", desc: "Chain merged across venues for one expiry (best marks per strike).", caveat: IV_PCT },
      chain_latest: { path: "/api/market/chain-latest", desc: "Latest snapshot of every instrument at one venue (all expiries; ~300 KB, use fields/limit).", caveat: "Large: pass `fields` and `limit`." },
      instrument_history: { path: "/api/market/chain-history", defaultSource: true, desc: "Time series for one instrument (venue-native name, e.g. BTC-11OCT26-83000-C on deribit, BTC-20261011-100000-C on derive).", smokeSkip: true },
      instruments: { path: "/api/market/orderbook/instruments", desc: "Instrument names at one venue (default venue unless `source`), for instrument_history / scanner_chart.", defaultSource: true, slow: true },
      strike_insight: { path: "/api/market/strike-insight", desc: "One strike: call/put greeks, tape buy/sell volume and premium, turnover, RFQ strategies. Needs `strike`; `window` 24h|7d|30d|90d.", page: "strike-insight", smokeSkip: true },
      strike_history: { path: "/api/market/strike-insight/history", desc: "One strike+type: IV/mark/OI history. Needs strike, option_type C|P.", smokeSkip: true },
      strike_events: { path: "/api/market/strike-insight/events", desc: "One strike+type: trade/RFQ events (paged with limit/offset params).", smokeSkip: true },
      strike_rfq_strategies: { path: "/api/market/strike-insight/rfq-strategies", desc: "Block/RFQ strategies that touched one strike.", smokeSkip: true },
    },
  },
  {
    name: "dm_iv",
    title: "Implied volatility: term structure, smile, surface, percentiles",
    intro: `ATM IV term structure, per-expiry smile, IV surface history, IV percentile/rank and IV-crush scans. ${IV_PCT}`,
    views: {
      term_structure: { path: "/api/market/term-structure", desc: "ATM IV per expiry (the term structure) by venue.", page: "term" },
      term_watermarks: { path: "/api/market/term-structure/watermarks", desc: "Term structure vs its lookback min/max/median (is the curve rich or cheap?).", page: "term" },
      smile: { path: "/api/market/iv-smile", desc: "IV by strike/delta for one venue + expiry.", page: "surfaces" },
      aggregate_smile: { path: "/api/market/aggregate/iv-smile", desc: "Smile merged across venues for one expiry.", page: "surfaces" },
      term_history: { path: "/api/market/iv-term-history", desc: "History of ATM IV per tenor for one venue.", page: "term", slow: true },
      term_history_aggregate: { path: "/api/market/iv-term-history/aggregate", desc: "History of ATM IV per tenor across venues.", page: "term", slow: true },
      surface_history: { path: "/api/market/iv-surface-history", desc: "IV surface snapshots over time (1+ MB; use small `hours`/`buckets`).", caveat: "Large payload: pass params {hours: 24, buckets: 6}.", defaults: { hours: 24 }, page: "surfaces", slow: true },
      boxplot: { path: "/api/market/iv-boxplot", desc: "Distribution (box plot) of IV per expiry across strikes.", page: "surfaces" },
      percentile_search: { path: "/api/market/iv-percentile/search", desc: "Expiries ranked by ATM-IV percentile (filter min_pct/max_pct/lookback_days).", caveat: "The site's screener table was seen listing only expired expiries (Oct 2026); check `tenor_days`/expiry dates before quoting.", page: "iv-percentile" },
      crush_scan: { path: "/api/market/iv-crush-scan", desc: "Expiries/strikes where IV dropped more than threshold_pct over the lookback.", page: "iv-percentile" },
      vrp: { path: "/api/market/atm-vs-rv", desc: "ATM implied vs realized vol over time (variance risk premium). ~190 KB.", page: "iv-rv-vrp", slow: true },
    },
  },
  {
    name: "dm_skew",
    title: "Skew, risk reversals, wings and tail risk",
    intro: "25-delta skew/risk reversals by maturity, their history and percentile bands, wing richness and far-OTM tail strikes.",
    views: {
      by_maturity: { path: "/api/market/skew-by-maturity", desc: "25-delta risk reversal (rr_25d) per expiry and venue.", caveat: "Sign: check the field names; the Skew page shows RR as call IV minus put IV, while Tail Strike and the site docs use put minus call. State the convention you quote.", page: "skew" },
      watermarks: { path: "/api/market/skew/watermarks", desc: "Skew per tenor vs lookback min/max/median.", page: "skew" },
      sparklines: { path: "/api/market/skew-sparklines", desc: "Skew history sparklines per tenor (narrowed to the default venue: all venues is 27 MB).", narrowSources: true, page: "skew", slow: true },
      rr_history: { path: "/api/market/rr-history", desc: "Risk-reversal history for a tenor (params tenor, lookback_days).", page: "skew", slow: true },
      wings: { path: "/api/wings", desc: "Wing richness for one expiry (OTM put/call wings vs ATM).", caveat: "The 0DTE row has been seen with inverted strikes; prefer expiries >= 1 day.", page: "skew" },
      wings_expiries: { path: "/api/wings/expiries", desc: "Expiries available for the wings view.", slow: true },
      tail_strike: { path: "/api/market/tail-strike", desc: "Tail-risk gauge: tail_strike_score, 10d/25d put and call IV, signal, flash_crash_risk.", caveat: "Uses put-minus-call skew; ATM IV may be null ('n/a' on the site).", page: "tail-strike" },
      tail_strike_history: { path: "/api/market/tail-strike-history", desc: "Tail-risk history (window_days). ~130 KB.", page: "tail-strike", slow: true },
    },
  },
  {
    name: "dm_realized_vol",
    title: "Realized vol, vol indices and implied ranges",
    intro: "Realized-vol cones, weekly variance, implied move/probability cones, straddle-implied range and the DVOL / MBVI volatility indices.",
    views: {
      vol_cone: { path: "/api/market/vol-cone", desc: "Realized-vol cone (percentiles per window) vs current IV.", page: "iv-rv-vrp", slow: true },
      weekly_variance: { path: "/api/market/weekly-variance", desc: "Weekly realized variance vs implied (param weeks).", page: "iv-rv-vrp", slow: true },
      prob_cone: { path: "/api/market/prob-cone", desc: "Implied 1/2-sigma price cone by expiry.", page: "levels" },
      implied_prob: { path: "/api/market/implied-prob", desc: "Risk-neutral probability distribution of spot at one expiry.", page: "levels" },
      straddle_range: { path: "/api/market/straddle-range", desc: "ATM straddle price and the implied up/down range for an expiry.", page: "levels" },
      vol_lifecycle: { path: "/api/market/vol-lifecycle", desc: "Vol lifecycle phase (e.g. compression/expansion) with confidence, IV percentile, IV and skew velocity, term slope." },
      dvol: { path: "/api/market/dvol-index", desc: "Deribit DVOL index history (param days).", page: "vol-index", slow: true },
      mbvi: { path: "/api/market/mbvi-index", desc: "MBVI, the site's multi-venue 30-day vol index: current, 24h change, per-venue values, 7-day hourly history.", page: "vol-index" },
      mbvi_candles: { path: "/api/market/mbvi-candles", desc: "MBVI OHLC candles (resolution, from_ms, to_ms).", page: "vol-index" },
    },
  },
  {
    name: "dm_gex",
    title: "Dealer gamma (GEX) and greek exposure",
    intro:
      "Dealer positioning: gamma exposure by strike, gamma flip, call/put walls, DEX/VEX, charm/vanna/higher-order greeks, exposure projections and scenario P&L. GEX is estimated from open interest with an assumed dealer side, so it is a model, not observed positioning.",
    views: {
      gex: { path: "/api/market/gex", desc: "Per-strike call/put/net GEX for one venue + expiry (view standard|corrected).", page: "gex-profile" },
      aggregate_gex: { path: "/api/market/aggregate/gex", desc: "Per-strike GEX merged across venues for one expiry.", page: "gex-profile" },
      profile: { path: "/api/market/gex-profile", desc: "GEX profile across all expiries by strike (sources = venues; default all).", caveat: "The site page often shows 'No gamma data' for single venues; an empty `items` means no data, not zero gamma.", page: "gex-profile" },
      profile_live: { path: "/api/market/gex-profile-live", desc: "Live OI profile with max_pain plus the gamma flip, in one call (optionally one expiry).", page: "gex-profile" },
      gamma_flip: { path: "/api/market/gamma-flip", desc: "Gamma flip strike, distance from spot (usd/pct), regime (positive/negative gamma) and the net GEX profile. Walls: dm_markets market_summary.", caveat: "Cross-venue and Deribit-only flips differ (seen ~$82.7k vs ~$79.9k); say which `sources` you used.", page: "levels" },
      ivr_gamma_flip: { path: "/api/market/ivr-gamma-flip", desc: "IV rank combined with gamma-flip regime (one compact signal).", page: "levels" },
      dealer_positioning: { path: "/api/market/dealer-positioning", desc: "Dealer GEX/VEX/DEX by strike and expiry with trade-flow signing (signing flow|naive).", page: "greeks" },
      dex_table: { path: "/api/market/dex-table", desc: "Delta exposure (DEX) table by expiry.", page: "greeks" },
      expiry_exposure: { path: "/api/market/expiry-exposure", desc: "Greek exposure per expiry (which expiries carry the gamma).", page: "greek-exposure" },
      projection: { path: "/api/market/greek-exposure-projection", desc: "Projected greek exposure as time/spot move (1.5 MB; pass bucket/agg).", caveat: "Large payload: use `fields`/`limit`.", page: "greek-exposure", slow: true },
      strike_heatmap: { path: "/api/market/gex-strike-heatmap", desc: "GEX by strike over time (slow, 5-11 s).", narrowSources: true, page: "heatmaps", slow: true },
      thermography: { path: "/api/market/thermography", desc: "Exposure heatmap by strike x expiry for a greek (param greek).", page: "thermography", slow: true },
      higher_greeks: { path: "/api/market/higher-greeks", desc: "Vanna, charm, vomma, speed, zomma, color per strike.", page: "greeks" },
      vanna: { path: "/api/market/vanna", desc: "Vanna exposure by strike.", page: "greek-exposure" },
      greek_pnl: { path: "/api/market/greek-pnl", desc: "Scenario P&L attribution of the market book: ds (spot shock), dvol (vol shock), dt (days).", page: "greeks" },
      pnl_surface: { path: "/api/market/pnl-surface", desc: "P&L surface (spot x time) for one option: strike, option_type call|put, expiry, contracts.", caveat: "option_type here is call/put (the server rejects C/P); the tool converts C/P for you.", page: "calculator", smokeSkip: true },
    },
  },
  {
    name: "dm_open_interest",
    title: "Open interest and put/call ratios",
    intro: "Options open interest by strike, by expiry and by type, OI changes, OI heatmaps and put/call ratio history.",
    views: {
      by_strike: { path: "/api/market/oi-profile", desc: "OI and market value by strike and venue, plus max_pain and totals; optionally one expiry.", page: "open-interest" },
      by_strike_live: { path: "/api/market/oi-profile-live", desc: "Live OI by strike.", page: "open-interest" },
      by_expiry: { path: "/api/market/oi-by-expiry", desc: "OI per expiry (calls/puts/notional).", page: "open-interest" },
      by_type: { path: "/api/market/oi-by-type", desc: "Total call vs put OI.", page: "open-interest" },
      change: { path: "/api/market/oi-change", desc: "OI change over lookback_hours (breakdown by strike/expiry).", page: "open-interest" },
      strike_heatmap: { path: "/api/market/oi-strike-heatmap", desc: "OI by strike over time (slow; up to 30 s cold).", narrowSources: true, page: "heatmaps", slow: true },
      put_call_history: { path: "/api/market/pc-ratio-history", desc: "Put/call ratio history (tenor, lookback_days).", page: "volume-flow", slow: true },
    },
  },
  {
    name: "dm_flow",
    title: "Options trade flow and scanner",
    intro: "Exchange options trades (the tape), buyer/seller-initiated flow, premium and volume by strike, fresh positioning, 0DTE distribution and the top-movers scanner.",
    views: {
      tape: { path: "/api/market/trades/aggregate", desc: "Recent options trades across venues (since_ms, limit, spread).", page: "tape" },
      summary: { path: "/api/market/flow-summary", desc: "Trades since since_ms grouped by expiry x call/put x buy/sell: count, amount, premium, notional.", page: "volume-flow" },
      net_premium: { path: "/api/volume-flow/net-premium", desc: "Net premium bought vs sold (scope, window_h).", page: "volume-flow" },
      by_strike: { path: "/api/market/volume-by-strike", desc: "Traded volume by strike.", page: "volume-flow" },
      fresh_positioning: { path: "/api/market/fresh-positioning-by-strike", desc: "Opening vs closing flow by strike (new positions).", page: "volume-flow" },
      aggregate: { path: "/api/market/flow-agg", desc: "Flow over window_h: call vs put premium, net flow, top trades with IV, flow by expiry (~230 KB).", page: "order-flow" },
      premium_matrix: { path: "/api/market/premium-flow-matrix", desc: "Premium traded by strike x expiry (window_h).", page: "premium" },
      map_bins: { path: "/api/market/flow-map-bins", desc: "Bubble-map bins of trades by time x price (heavy on wide windows).", page: "order-flow" },
      zero_dte: { path: "/api/market/zdte-distribution", desc: "0DTE / short-dated flow distribution (dte_max).", page: "volume-flow" },
      movers: { path: "/api/scanner/movers", desc: "Option contracts with the biggest % price change over tf (5m|15m|30m|1h|4h|1d).", caveat: "Upstream mixes in other assets' contracts; rows for other underlyings are removed (see filteredOtherAssets).", filterAsset: true, page: "scanner" },
      scanner_expiries: { path: "/api/scanner/expiries", desc: "Expiries available to the scanner.", page: "scanner" },
      scanner_chart: { path: "/api/scanner/chart", defaultSource: true, desc: "Price/IV candles for one instrument (instrument, tf).", page: "scanner", smokeSkip: true },
    },
  },
  {
    name: "dm_blocks",
    title: "Block trades and RFQ flow (Paradigm, Deribit, Derive)",
    intro:
      "Institutional block/RFQ trades across venues: the trade ledger, stats, strategy popularity, whale leaderboard, net-delta tape, strike ladder and decoded trades. Paradigm Telegram-feed views (tg_*) have had no new data since 19 Jul 2026.",
    views: {
      trades: { path: "/api/rfq/trades", desc: "Block/RFQ trade ledger (source, status, since_ms, limit, offset) with legs and marks.", caveat: "Notional conventions differ by page: /blocks sums all legs, Aggregated counts one leg's size.", page: "block-rfq/aggregated" },
      stats: { path: "/api/rfq/stats", desc: "Block totals over `hours`: count by status, notional split buy/sell, calls/puts, bullish/bearish.", page: "block-rfq/aggregated" },
      strategy_popularity: { path: "/api/rfq/strategy-popularity", desc: "Most traded block strategies (spreads, straddles...) over `hours`.", caveat: "Paradigm rows may all read 'Unclassified'.", page: "block-rfq/aggregated" },
      settlement_price: { path: "/api/rfq/settlement-price", desc: "Settlement price for an expiry (param expiry_date).", smokeSkip: true },
      whale_leaderboard: { path: "/api/rfq/insights/whale-leaderboard", desc: "Largest block trades/traders over `hours`.", page: "block-rfq/aggregated" },
      strategy_rotation: { path: "/api/rfq/insights/strategy-rotation", desc: "How block strategy mix shifts over days.", page: "block-rfq/aggregated" },
      net_delta_tape: { path: "/api/rfq/insights/net-delta-tape", desc: "Net delta bought/sold through blocks over time.", page: "block-rfq/aggregated" },
      strike_ladder: { path: "/api/rfq/insights/strike-ladder", desc: "Block notional by strike (~100 KB).", page: "block-rfq/aggregated" },
      vol_flow_gauge: { path: "/api/rfq/insights/vol-flow-gauge", desc: "Are blocks net buying or selling vol? (gauge).", page: "block-rfq/aggregated" },
      iv_prints: { path: "/api/rfq/insights/iv-prints", desc: "IV printed on recent blocks.", page: "block-rfq/aggregated" },
      strategy_bursts: { path: "/api/rfq/insights/strategy-bursts", desc: "Unusual bursts of one strategy vs baseline.", page: "block-rfq/aggregated" },
      trade_decode: { path: "/api/rfq/insights/trade-decode", desc: "Decode one block (rfq_id from `trades`): structure, greeks, intent. Only Paradigm DRFQ blocks (source paradigm_drfq) decode; others 404.", smokeSkip: true },
      feed_health: { path: "/api/rfq/deribit/health", desc: "Deribit block feed health (also: paradigm_health, telegram_health)." },
      paradigm_health: { path: "/api/rfq/paradigm/health", desc: "Paradigm feed health." },
      telegram_health: { path: "/api/rfq/telegram/health", desc: "Paradigm Telegram feed health.", caveat: "Telegram feed stale since 19 Jul 2026." },
      tg_hourly_heatmap: { path: "/api/rfq/tg/hourly-heatmap", desc: "Telegram blocks by hour-of-day.", caveat: "Stale since 19 Jul 2026." },
      tg_size_histogram: { path: "/api/rfq/tg/block-size-histogram", desc: "Telegram block size histogram.", caveat: "Stale since 19 Jul 2026." },
      tg_instrument_frequency: { path: "/api/rfq/tg/instrument-frequency", desc: "Most-traded instruments in the Telegram feed.", caveat: "Stale since 19 Jul 2026." },
      tg_similar_trades: { path: "/api/rfq/tg/similar-trades", desc: "Past trades with the same strategy_code.", caveat: "Stale since 19 Jul 2026.", smokeSkip: true },
    },
  },
  {
    name: "dm_divergence",
    title: "Cross-exchange divergence and lead-lag",
    intro: "Where venues disagree: IV, basis and gamma divergence per expiry, quote freshness, cross-venue arbitrage candidates and which venue leads price.",
    views: {
      iv: { path: "/api/market/divergence/iv", desc: "IV by strike per venue for one expiry, with spreads.", page: "divergence" },
      basis: { path: "/api/market/divergence/basis", desc: "Spot/forward basis per venue for one expiry.", page: "divergence" },
      gamma: { path: "/api/market/divergence/gamma", desc: "GEX per venue for one expiry.", page: "divergence" },
      freshness: { path: "/api/market/divergence/freshness", desc: "Quote age per venue (stale quotes cause fake divergence).", page: "divergence" },
      arb: { path: "/api/market/divergence/arb", desc: "Cross-venue IV arbitrage candidates per expiry: buy/sell venue, iv_spread_vp, fee_cost_vp, net_edge_vp.", caveat: "net_edge_vp = IV spread minus the site's fee estimate (vol points); margin, slippage and fill risk are not included.", page: "arb-guide" },
      lead_lag: { path: "/api/market/lead-lag", desc: "Venue lead-lag correlation matrix.", caveat: "Correlations are noisy; treat as indicative.", page: "lead-lag" },
      lead_lag_history: { path: "/api/market/lead-lag/history", desc: "Lead-lag between two venues over time (source_a, source_b, lag_seconds, hours).", page: "lead-lag", smokeSkip: true },
    },
  },
  {
    name: "dm_futures",
    title: "Futures basis, funding and term structure",
    intro: "Dated-futures basis/APR and term structure, perpetual funding across exchanges and futures price history.",
    views: {
      basis: { path: "/api/futures/basis", desc: "Every dated future: price, premium vs index, annualized basis (APR %), term structure.", page: "futures/basis" },
      funding_current: { path: "/api/futures/funding/current", desc: "Current perp funding per exchange (funding_rate_8h in %, apr_pct in %).", page: "futures/funding" },
      funding_history: { path: "/api/futures/funding/history", desc: "Funding history for one exchange (source, days).", page: "futures/funding", slow: true },
      history: { path: "/api/futures/history", desc: "Price history for one futures instrument (instrument, source, days).", page: "futures/history", smokeSkip: true },
    },
  },
  {
    name: "dm_orderflow",
    title: "Perp/spot order flow and candles",
    intro: "Underlying order-flow microstructure: footprint, CVD, volume delta, TPO profile, liquidations, OI, liquidity heatmap, spot candles and time-at-price.",
    views: {
      footprint: { path: "/api/orderflow/footprint", desc: "Footprint bars (bid/ask volume per price level; tf, limit).", page: "order-flow" },
      cvd: { path: "/api/orderflow/cvd", desc: "Cumulative volume delta.", page: "order-flow" },
      volume_delta: { path: "/api/orderflow/vd", desc: "Per-bar volume delta (tf, limit).", page: "order-flow" },
      tpo: { path: "/api/orderflow/tpo", desc: "TPO / market profile (value area, POC).", page: "order-flow" },
      liquidations: { path: "/api/orderflow/liquidations", desc: "Recent liquidations.", page: "order-flow" },
      open_interest: { path: "/api/orderflow/oi", desc: "Perp open interest series.", page: "order-flow" },
      liquidity_heatmap: { path: "/api/orderflow/heatmap", desc: "Order-book liquidity heatmap snapshots (~300 KB; small `snapshots`).", defaults: { snapshots: 20 }, page: "order-flow" },
      spot_candles: { path: "/api/market/spot-candles", desc: "Spot OHLC candles (tf, source, limit).", page: "spot" },
      spot_history: { path: "/api/market/spot-history", desc: "Spot per venue over window_minutes.", page: "spot" },
      time_at_price: { path: "/api/market/time-at-price-kline", desc: "Candles with time spent at each price bin.", page: "spot" },
    },
  },
  {
    name: "dm_quant",
    title: "Quant vol models and signals",
    intro: "Fitted volatility models (SVI, Heston, Merton jump-diffusion, rough vol) and, signed in, the regime / direction / anomaly signals.",
    views: {
      svi: { path: "/api/market/svi-surface", desc: "SVI fit for one expiry (raw params + fitted smile).", page: "quant" },
      svi_full: { path: "/api/market/svi-full-surface", desc: "SVI fit for every expiry at one venue." , page: "quant", slow: true },
      heston: { path: "/api/market/heston-surface", desc: "Heston model surface (optional v0, theta, kappa, xi, rho).", page: "quant" },
      merton_jump: { path: "/api/market/merton-jump", desc: "Merton jump-diffusion fit (optional lambda_, mu_j, sigma_j).", page: "quant" },
      rough_vol: { path: "/api/market/rough-vol", desc: "Rough-volatility (Hurst exponent) estimate.", page: "quant" },
      regime: { path: "/api/quant/regime", auth: true, desc: "Vol regime classification + Markov transition probabilities (signed in).", caveat: "The Vol Regime page is marked 'under construction'.", page: "vol-regime" },
      direction: { path: "/api/quant/direction", auth: true, desc: "Directional model signal (signed in).", page: "quant" },
      diagnostics: { path: "/api/quant/diagnostics", auth: true, desc: "Model diagnostics (signed in).", page: "quant" },
      anomalies: { path: "/api/quant/anomaly/recent", auth: true, desc: "Recent market anomalies detected (signed in).", page: "quant" },
    },
  },
  {
    name: "dm_strategy",
    title: "Strategy ideas and scanner",
    intro: "Ranked multi-leg option strategy ideas for a market view (bias bullish|bearish|neutral|long_vol|short_vol) with legs, cost, max loss/gain, probability of profit and EV. These are model outputs, not advice.",
    views: {
      picks: { path: "/api/strategy/picks", desc: "Top strategies for one expiry and bias: legs, net_cost, max_loss/gain, pop, ev, scores, plus the risk-neutral density.", defaults: { bias: "neutral" }, page: "strategy" },
      scan: { path: "/api/strategy/scan", desc: "Cross-expiry scan for a bias, target_pct move and max_dte.", defaults: { bias: "neutral" }, page: "strategy/scan" },
    },
  },
  {
    name: "dm_ibit",
    title: "IBIT (BlackRock bitcoin ETF) options",
    intro: "US-listed IBIT options from ThetaData: chain, dealer GEX, flow, IV rank, OI history, VRP and the IBIT-vs-BTC IV spread. Data follows US market hours (stale on weekends).",
    views: {
      spot: { path: "/api/ibit/spot", desc: "IBIT price bars (tf).", page: "../ibit/chart" },
      spot_ref: { path: "/api/ibit/spot-ref", desc: "IBIT vs BTC reference price (tf).", page: "../ibit/cross" },
      chain: { path: "/api/ibit/chain/all", desc: "Full IBIT chain (1.2 MB; use fields/limit).", page: "../ibit", slow: true },
      dealer_gex: { path: "/api/ibit/dealer-gex", desc: "Dealer GEX by strike (model, window).", page: "../ibit/greeks" },
      gex_map: { path: "/api/ibit/gex-map", desc: "GEX map over time (700 KB).", page: "../ibit/greeks", slow: true },
      flow: { path: "/api/ibit/flow-agg", desc: "Options flow aggregate (window_h).", page: "../ibit/flow" },
      flow_wheel: { path: "/api/ibit/flow-wheel", desc: "Call/put buy/sell flow wheel (sessions).", page: "../ibit/flow" },
      trades: { path: "/api/ibit/trades", desc: "Recent IBIT option trades (limit).", page: "../ibit/flow" },
      iv_rank: { path: "/api/ibit/iv-rank", desc: "IV rank/percentile.", caveat: "IBIT chain IV is a fraction (0.49 = 49%), unlike crypto endpoints.", page: "../ibit/vol" },
      oi_history: { path: "/api/ibit/oi-history", desc: "OI history (days; 450 KB).", page: "../ibit/risk", slow: true },
      skew: { path: "/api/ibit/spot-vol-skew", desc: "Spot-vol-skew relationship (bar).", page: "../ibit/vol" },
      vrp: { path: "/api/ibit/vrp", desc: "Implied vs realized (bar, lookback_days).", page: "../ibit/vol" },
      btc_iv_spread: { path: "/api/ibit/btc-iv-spread", desc: "IBIT IV minus BTC crypto-venue IV.", page: "../ibit/cross" },
    },
  },
  {
    name: "dm_backtest",
    title: "Options backtester",
    intro:
      "Replay an option position on stored 5-minute candles (BTC and ETH only; data starts ~6 Jul 2026, so tests span days to weeks). Run returns entry/exit, P&L and a greek-attributed P&L series.",
    views: {
      meta: { assets: ["btc", "eth"], path: "/api/backtest/meta", desc: "Data window and the instruments available per expiry (250 KB; use fields).", page: "backtest", slow: true },
      spot_at: { assets: ["btc", "eth"], path: "/api/backtest/spot-at", desc: "Spot at a timestamp (ts_ms).", page: "backtest", smokeSkip: true },
      run: {
        assets: ["btc", "eth"],
        path: "/api/backtest/run",
        method: "POST",
        desc: "Run a backtest. body: {source, legs:[{instrument, direction long|short}] (max 2, names from meta e.g. BTC-9OCT26-82000-C with unpadded day), entry_ts_ms, exit_rule fixed_ts|dte_exit|pct_profit|loss_stop, exit_ts_ms|exit_dte|exit_pct_profit|exit_loss_type+exit_loss_value, fill_mode mark, apply_fees}.",
        caveat: "fill_mode 'bidask' has returned HTTP 500 and 'dte_exit' can hang; prefer fill_mode 'mark' with fixed_ts.",
        page: "backtest",
        smokeSkip: true,
      },
      v2_meta: { assets: ["btc", "eth"], path: "/api/backtest/v2/meta", auth: true, desc: "Backtest v2 data catalogue (signed in).", caveat: "Returned HTTP 500 for every asset/source on 2026-10-10 even when signed in (upstream bug).", page: "backtest", smokeSkip: true },
      v2_hedge: { assets: ["btc", "eth"], path: "/api/backtest/v2/hedge", method: "POST", auth: true, desc: "Delta-hedged backtest (signed in; body as the site sends it).", page: "backtest", smokeSkip: true },
    },
  },
];

/** Site sections that have no data tool of their own, and why. */
export const NOT_SERVED: Record<string, string> = {
  "live streams": "WebSocket feeds (spot, trades, chain, divergence, orderflow, MBVI live) are not exposed; every tool returns a REST snapshot.",
  "order book": "/api/market/orderbook answers 404 'no order book' for every instrument tried.",
  "posts": "/api/posts was empty when mapped.",
  "account writes": "Saving layouts, creating/deleting paper positions or alerts, feedback and post drafts are not exposed (read-only server).",
  "missing pages": "/{asset}/quant, /greek-exposure/higher-greeks, /delta-hedge and /orderflow-v2 redirect to the dashboard on the site; their data is under dm_quant, dm_gex(higher_greeks) and dm_orderflow.",
};
