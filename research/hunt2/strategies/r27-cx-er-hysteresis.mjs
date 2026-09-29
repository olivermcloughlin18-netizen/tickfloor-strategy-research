// Kaufman efficiency-ratio regime hysteresis: only flip position when the 28-bar
// path is efficient (ER >= erMin); otherwise hold the last position. Long-only,
// starts long (same as buy-and-hold) through warm-up and low-efficiency regimes.
// Source: u/GemeriCorp, r/Trading 1wop3th (regime drift thread); Kaufman 2013
// "Trading Systems and Methods" (efficiency ratio).

export const meta = {
  id: "r27-cx-er-hysteresis",
  name: "Crypto 4-week trend that only switches when the move is efficient",
  family: "trend",
  source: "u/GemeriCorp, r/Trading 1wop3th (regime drift: rules work in one regime and stop in another; our reply asked for the regime filter itself to be tested); Kaufman 2013 'Trading Systems and Methods' (efficiency ratio)",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  params: { lookback: 28, erMin: 0.30 },
};

export function signal(bars, i, ctx) {
  if (ctx.state.pos === undefined) ctx.state.pos = 1;
  const n = ctx.params.lookback;
  if (i < n) return 1;

  let path = 0;
  for (let k = i - n + 1; k <= i; k++) {
    path += Math.abs(bars[k].close - bars[k - 1].close);
  }
  const er = path > 0 ? Math.abs(bars[i].close - bars[i - n].close) / path : 0;

  if (er >= ctx.params.erMin) {
    ctx.state.pos = bars[i].close > bars[i - n].close ? 1 : 0;
  }

  return ctx.state.pos;
}
