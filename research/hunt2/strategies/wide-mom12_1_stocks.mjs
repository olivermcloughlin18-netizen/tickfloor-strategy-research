export const meta = {
  id: "wide-mom12_1_stocks",
  name: "12-1 cross-sectional momentum, top 4 of 40 large caps, monthly (wide US stocks)",
  family: "momentum",
  source: "Jegadeesh & Titman 1993",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { lookback: 252, skip: 21, top: 4 },
};

export function rank(universe, t, ctx) {
  const { lookback, skip, top } = ctx.params;
  const scores = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < lookback + 1) continue;
    scores.push([sym, b[b.length - 1 - skip].close / b[b.length - 1 - lookback].close - 1]);
  }
  if (scores.length < top * 2) return {};
  scores.sort((x, y) => y[1] - x[1]);
  const w = {};
  for (const [sym] of scores.slice(0, top)) w[sym] = 1 / top;
  return w;
}
