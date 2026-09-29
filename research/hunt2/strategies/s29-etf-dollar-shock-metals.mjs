export const meta = {
  id: "s29-etf-dollar-shock-metals",
  name: "Metals and commodities after a sharp weekly dollar drop",
  family: "other",
  source: "Capie, Mills & Wood 2005 (gold and the dollar); Akram 2009 Energy Economics (commodity prices respond to dollar shocks with a lag)",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["GLD","SLV","DBC"],
  params: { lag: 5, drop: -0.01, holdBars: 20 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params, s = ctx.state;
  if (s.left === undefined) s.left = 0;
  if (s.left > 0) { s.left--; return 1; }
  if (i < p.lag) return 0;
  const d = ctx.macro("DTWEXBGS", i), d0 = ctx.macro("DTWEXBGS", i - p.lag);
  if (d == null || d0 == null) return 0;
  if (d / d0 - 1 <= p.drop) { s.left = p.holdBars - 1; return 1; }
  return 0;
}
