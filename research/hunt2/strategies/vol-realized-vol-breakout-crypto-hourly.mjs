// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "vol-realized-vol-breakout-crypto-hourly",
  name: "Realized-vol expansion trigger (independent of price breakout) 1h crypto",
  family: "volatility expansion signal",
  source: "market microstructure literature on volatility clustering (Engle ARCH/GARCH lineage), no direct 1h crypto backtest found",
  assetClass: "crypto",
  timeframe: "1h",
  longShort: true,                 // can go short on down candles
  params: {
    returnWindow: 20,              // stdev window for realized vol
    medianWindow: 100,             // median window for realized vol
    volMultiplier: 2,              // vol must jump > 2x median
    atrWindow: 14,                 // ATR window for stops/targets
    stopMultiplier: 1,             // stop = 1xATR14
    targetMultiplier: 2,           // target = 2xATR14
    maxHoldBars: 8                 // max bars to hold position
  },
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  if (!ctx.state) {
    ctx.state = { pos: 0, entryBar: -1, stop: 0, target: 0, vols: [] };
  }

  const p = ctx.params;
  const s = ctx.state;

  // Ensure vols array exists
  if (!s.vols) {
    s.vols = [];
  }

  if (i + 1 < p.returnWindow + 1) return 0;

  // Calculate realized vol for current bar
  const calcVol = () => {
    const r = [];
    for (let k = i - p.returnWindow + 1; k <= i; k++) {
      r.push(Math.log(bars[k].close / bars[k - 1].close));
    }
    const avg = r.reduce((a, b) => a + b) / r.length;
    const variance = r.reduce((sum, x) => sum + (x - avg) ** 2) / r.length;
    return Math.sqrt(variance);
  };

  const v = calcVol();

  // Track vol history
  s.vols.push(v);
  if (s.vols.length > p.medianWindow) {
    s.vols.shift();
  }

  // Calculate median if we have enough history
  let median = v;
  if (s.vols.length === p.medianWindow) {
    const sorted = [...s.vols].sort((a, b) => a - b);
    const n = sorted.length;
    median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[(n - 1) / 2];
  } else {
    return 0;
  }

  // Handle position exit
  if (s.pos) {
    const hold = i - s.entryBar;
    const close = bars[i].close;
    const shouldExit = s.pos > 0 ? (close <= s.stop || close >= s.target || hold >= p.maxHoldBars) : (close >= s.stop || close <= s.target || hold >= p.maxHoldBars);
    if (shouldExit) {
      s.pos = 0;
      return 0;
    }
    return s.pos;
  }

  // Check breakout
  if (v <= p.volMultiplier * median) return 0;

  // Calculate ATR
  let atr = 0;
  for (let k = i - p.atrWindow + 1; k <= i; k++) {
    const prev = k > 0 ? bars[k - 1].close : bars[0].open;
    const tr = Math.max(bars[k].high - bars[k].low, Math.abs(bars[k].high - prev), Math.abs(bars[k].low - prev));
    atr += tr;
  }
  atr /= p.atrWindow;

  // Enter
  const dir = bars[i].close >= bars[i].open ? 1 : -1;
  s.entryBar = i;
  s.pos = dir;
  s.stop = bars[i].close + (dir > 0 ? -p.stopMultiplier * atr : p.stopMultiplier * atr);
  s.target = bars[i].close + (dir > 0 ? p.targetMultiplier * atr : -p.targetMultiplier * atr);

  return s.pos;
}

// PORTFOLIO strategies (cross-sectional): delete signal() above and export rank() instead.
// Add to meta: universe: "US_STOCKS_DAILY" (or CRYPTO_DAILY / ETFS_DAILY), rebalance: "monthly" (or weekly / daily).
// universe[SYMBOL] = bars up to and including date t, for every asset that traded on t.
// Return weights {SYMBOL: weight}; weights >= 0 unless longShort, sum of |weights| <= 1, missing = 0.
//
// export function rank(universe, t, ctx) {
//   const scores = [];
//   for (const sym of Object.keys(universe)) {
//     const b = universe[sym];
//     if (b.length < 253) continue;
//     scores.push([sym, b[b.length - 22].close / b[b.length - 253].close - 1]);
//   }
//   scores.sort((x, y) => y[1] - x[1]);
//   const top = scores.slice(0, 4);
//   const w = {};
//   for (const [sym] of top) w[sym] = 1 / top.length;
//   return w;
// }
