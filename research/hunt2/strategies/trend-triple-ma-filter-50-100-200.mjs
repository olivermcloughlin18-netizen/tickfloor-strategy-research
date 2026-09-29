// Triple moving average trend filter (50/100/200 alignment), tested on GLD
// (catalogue rule allows SPY or GLD; GLD used directly, not holdout).
export const meta = {
  id: "trend-triple-ma-filter-50-100-200",
  name: "Triple MA alignment filter (GLD)",
  family: "trend",
  source: "Common retail trend-stacking heuristic; cf. edge trend §12 dual-MA",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["GLD"],
  params: { fast: 50, mid: 100, slow: 200 },
};

export function signal(bars, i, ctx) {
  const { fast, mid, slow } = ctx.params;
  if (i + 1 < slow) return 0;
  const smaFast = ctx.sma("close", fast, i);
  const smaMid = ctx.sma("close", mid, i);
  const smaSlow = ctx.sma("close", slow, i);
  return smaFast > smaMid && smaMid > smaSlow ? 1 : 0;
}
