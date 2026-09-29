// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "s29-cx-bull-steepener",
  name: "Crypto held during bull steepening with falling real yields (easing impulse)",
  family: "other",
  source: "Karau 2023 J. Int. Money & Finance ('Monetary policy and Bitcoin'); yield-curve easing-impulse literature (Estrella & Mishkin 1998)",
  assetClass: "crypto",
  timeframe: "1d",
  assets: ["BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "LINKUSDT", "TRXUSDT"],
  longShort: false,
  params: { lag: 60, slopeRise: 0.2 },
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
  const { lag, slopeRise } = ctx.params;
  if (i < lag) return 0;

  const slope = ctx.macro("T10Y2Y", i);
  const priorSlope = ctx.macro("T10Y2Y", i - lag);
  const realYield = ctx.macro("DFII10", i);
  const priorRealYield = ctx.macro("DFII10", i - lag);
  if (slope === null || priorSlope === null || realYield === null || priorRealYield === null) return 0;

  return slope - priorSlope >= slopeRise && realYield - priorRealYield < 0 ? 1 : 0;
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
