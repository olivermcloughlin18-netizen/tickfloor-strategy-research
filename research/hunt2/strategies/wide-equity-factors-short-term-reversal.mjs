export const meta = {
  id: "wide-equity-factors-short-term-reversal",
  name: "Short-term reversal (1-month) (wide US stocks)",
  family: "equity-factors",
  source: "Jegadeesh 1990 short-term reversal",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  longShort: true,
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
  const winners = scores.slice(-n);

  const w = {};
  for (const s of losers) w[s.sym] = 0.5 / losers.length;   // long losers
  for (const s of winners) w[s.sym] = -0.5 / winners.length; // short winners
  return w;
}
