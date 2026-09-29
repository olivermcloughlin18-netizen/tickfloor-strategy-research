// Gold vs real yields: gold's real price moves inversely with real (TIPS) yields.
// Source: Erb & Harvey 2013 FAJ "The Golden Dilemma"; Baur & Lucey 2010 Financial Review.
// Rule: track DFII10 (10y TIPS real yield). If it fell over the trailing 3 months
// (lagMonths), go long GLD; otherwise long AGG. Checked monthly.

export const meta = {
  id: "r27-gld-agg-realyield",
  name: "Gold or bonds by the 3-month change in real yields",
  family: "macro",
  source: "Erb & Harvey 2013 FAJ 'The Golden Dilemma' (gold's real price moves inversely with real yields); Baur & Lucey 2010 Financial Review",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["GLD", "AGG"],
  rebalance: "monthly",
  params: { lagMonths: 3 },
};

function ewPresent(universe) {
  const avail = ["GLD", "AGG"].filter((s) => universe[s]);
  const w = {};
  for (const sym of avail) w[sym] = 1 / avail.length;
  return w;
}

export function rank(universe, t, ctx) {
  const y = ctx.macro("DFII10");
  if (ctx.state.Y === undefined) ctx.state.Y = [];
  ctx.state.Y.push(y);
  const Y = ctx.state.Y;

  if (!universe.GLD || !universe.AGG) return ewPresent(universe);

  if (Y.length < 4) return { GLD: 0.5, AGG: 0.5 };
  const last = Y[Y.length - 1];
  const lag = Y[Y.length - 4];
  if (last === null || lag === null) return { GLD: 0.5, AGG: 0.5 };

  const d = last - lag;
  return d < 0 ? { GLD: 1 } : { AGG: 1 };
}
