export const meta = {
  id: "s29-etf-sector-acceleration",
  name: "Sector momentum acceleration",
  family: "momentum",
  source: "Gettleman & Marks 2006 SSRN ('Acceleration strategies'); Chen & Yu 2014",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLK","XLF","XLE","XLV","XLI","XLP","XLY","XLU","XLB"],
  rebalance: "monthly",
  params: { window: 63, top: 3 },
};

export function rank(universe, t, ctx) {
  const n = ctx.params.window;
  const scores = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym], L = b.length;
    if (L < 2 * n + 1 || L < 127) continue;
    const c = b[L - 1].close, c1 = b[L - 1 - n].close, c2 = b[L - 1 - 2 * n].close;
    scores.push([sym, (c / c1 - 1) - (c1 / c2 - 1)]);
  }
  scores.sort((x, y) => y[1] - x[1]);
  const top = scores.slice(0, ctx.params.top);
  const w = {};
  for (const [s] of top) w[s] = 1 / ctx.params.top;
  return w;
}
