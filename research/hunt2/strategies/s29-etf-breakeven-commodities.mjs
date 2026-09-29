// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "s29-etf-breakeven-commodities",
  name: "Commodities held while 3-month breakeven inflation is rising",
  family: "other",
  source: "Gorton & Rouwenhorst 2006 FAJ (commodities hedge unexpected inflation); Bekaert & Wang 2010 Economic Policy (inflation risk and the inflation risk premium)",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["DBC", "USO", "GLD", "SLV", "XLE"],
  longShort: false,
  params: { lag: 63, rise: 0.05 },
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state starts as {} (always truthy): initialise fields with `if (ctx.state.x === undefined)`.
// bar.time is epoch SECONDS (bar open). ctx.params is meta.params.
// O(1) helpers (see README "Speed helpers"): ctx.sma/ema/rollingStd(field, n), ctx.rsi(n), ctx.atr(n),
// ctx.donchian(n, i), ctx.rolling(n), ctx.resample(bars, "1w"|"1M").
// Known-by-close data: ctx.macro("VIX"|"T10Y2Y"|...), ctx.fearGreed(); crypto: ctx.fundingRate(), ctx.openInterest().
// Fewer than 5 trades = REJECTED (your signal never fired).
export function signal(bars, i, ctx) {
  const { lag, rise } = ctx.params;
  if (i < lag) return 0;
  const current = ctx.macro("T10YIE", i);
  const prior = ctx.macro("T10YIE", i - lag);
  if (current === null || prior === null) return 0;
  return current - prior > rise ? 1 : 0;
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
