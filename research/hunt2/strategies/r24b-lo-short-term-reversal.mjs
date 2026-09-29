// Mechanical long-only rewrite of wide-equity-factors-short-term-reversal.mjs (r24b batch, item B).
// This is the batch's own "buy-after-a-drop" control for the monthly-WIDE hypotheses (prereg 2e).
export const meta = {
  id: "r24b-lo-short-term-reversal",
  name: "Short-term reversal (1-month), long-only (wide US stocks)",
  family: "equity-factors",
  source: "Jegadeesh 1990 short-term reversal; long-only rewrite of wide-equity-factors-short-term-reversal",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: {
    lookback: 21,
    decile: 0.1,
  },
};

export function rank(universe, t, ctx) {
  const lookback = ctx.params.lookback;
  const scores = [];

  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < lookback + 1) continue;
    const pNow = b[b.length - 1].close;
    const pThen = b[b.length - 1 - lookback].close;
    if (pNow <= 0 || pThen <= 0) continue;
    scores.push({ sym, ret: pNow / pThen - 1 });
  }

  if (scores.length < 10) return {};
  scores.sort((a, b) => a.ret - b.ret); // ascending: losers first
  const n = Math.max(1, Math.floor(scores.length * ctx.params.decile));
  const losers = scores.slice(0, n);

  const w = {};
  for (const s of losers) w[s.sym] = 1 / losers.length; // long losers (buy-after-a-drop)
  return w;
}
