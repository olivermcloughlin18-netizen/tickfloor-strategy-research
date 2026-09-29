export const meta = {
  id: "wide-mrsa-cross-sectional-stock-reversal-1d",
  name: "Cross-sectional 1-day reversal, liquid large-cap stocks (wide US stocks)",
  family: "mean-reversion-statarb",
  source: "Jegadeesh 1990; Lo & MacKinlay 1990 RFS (short-term reversal); universe = harness's US_STOCKS_DAILY 40 large caps (S&P100 not available)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "daily",
  longShort: true,
  params: { decile: 0.2, jumpFilter: 0.15 },
};

export function rank(universe, t, ctx) {
  const scores = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < 2) continue;
    const ret = b[b.length - 1].close / b[b.length - 2].close - 1;
    if (Math.abs(ret) > ctx.params.jumpFilter) continue;
    scores.push({ sym, ret });
  }
  if (scores.length < 10) return {};
  scores.sort((a, b) => a.ret - b.ret);
  const n = Math.max(1, Math.floor(scores.length * ctx.params.decile));
  const bottom = scores.slice(0, n);
  const top = scores.slice(-n);
  const w = {};
  for (const s of bottom) w[s.sym] = 0.5 / bottom.length;
  for (const s of top) w[s.sym] = -0.5 / top.length;
  return w;
}
