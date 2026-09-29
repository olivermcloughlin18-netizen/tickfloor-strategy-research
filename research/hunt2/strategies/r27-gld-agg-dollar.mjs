// Gold vs the dollar: gold is a hedge against dollar weakness; currency momentum persists.
// Source: Capie, Mills & Wood 2005 J. Int. Financial Markets (gold as a hedge against the dollar);
// Menkhoff, Sarno, Schmeling & Schrimpf 2012 JFE (currency momentum).
// Rule: track DTWEXBGS (broad trade-weighted USD index). If it weakened over the trailing
// 3 months (lagMonths), go long GLD; otherwise long AGG. Checked monthly.
// Positively dependent with r27-gld-agg-realyield (disclosed).

export const meta = {
  id: "r27-gld-agg-dollar",
  name: "Gold or bonds by the 3-month change in the dollar",
  family: "macro",
  source: "Capie, Mills & Wood 2005 J. Int. Financial Markets (gold as a hedge against the dollar); Menkhoff, Sarno, Schmeling & Schrimpf 2012 JFE (currency momentum). Positively dependent with r27-gld-agg-realyield (disclosed).",
  assetClass: "etf",
  assets: ["GLD", "AGG"],
  timeframe: "1d",
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
  const d = ctx.macro("DTWEXBGS");
  if (ctx.state.D === undefined) ctx.state.D = [];
  ctx.state.D.push(d);
  const D = ctx.state.D;

  if (!universe.GLD || !universe.AGG) return ewPresent(universe);

  if (D.length < 4) return { GLD: 0.5, AGG: 0.5 };
  const last = D[D.length - 1];
  const lag = D[D.length - 4];
  if (last === null || lag === null) return { GLD: 0.5, AGG: 0.5 };

  const delta = last - lag;
  return delta < 0 ? { GLD: 1 } : { AGG: 1 };
}
