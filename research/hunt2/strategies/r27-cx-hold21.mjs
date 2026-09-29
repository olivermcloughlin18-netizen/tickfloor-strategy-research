// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "r27-cx-hold21",
  name: "Crypto 4-week momentum with a 21-day minimum hold",
  family: "trend",
  source: "u/Incon4ormista, r/ASX_Bets 1wo5lrs ('the ones that work out often take way longer than planned'); Kaufman 2013 (minimum holding periods cut whipsaw)",
  assetClass: "crypto",
  timeframe: "1d",
  // universe defaults to CRYPTO_DAILY (all 18 coins)
  holdBars: 21,
  params: { lookback: 28 },
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// ctx.state starts as {} (always truthy): initialise fields with `if (ctx.state.x === undefined)`.
// With meta.holdBars set, the harness itself turns each non-zero return into a 21-bar hold
// and only calls signal() again once that hold ends — no manual hold-state bookkeeping here.
export function signal(bars, i, ctx) {
  const n = ctx.params.lookback;
  if (i < n) return 1; // warm-up: hold the same as buy-and-hold
  return bars[i].close > bars[i - n].close ? 1 : 0;
}
