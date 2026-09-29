export const meta = {
  id: "s29-etf-safe-haven-drawdown",
  name: "Gold and long Treasuries while QQQ is 10% off its 1-year high",
  family: "other",
  source: "Baur & McDermott 2010 JBF ('Is gold a safe haven? International evidence')",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "DIA", "GLD", "TLT"],
  rebalance: "weekly",
  params: { window: 252, dd: -0.1 },
};

export function rank(universe, t, ctx) {
  const { window: n, dd: thr } = ctx.params;
  const q = universe.QQQ;
  if (!q || !universe.DIA || !universe.GLD || !universe.TLT || q.length < n) return {};
  let mx = -Infinity;
  for (let k = q.length - n; k < q.length; k++) if (q[k].close > mx) mx = q[k].close;
  const dd = q[q.length - 1].close / mx - 1;
  return dd <= thr ? { GLD: 0.5, TLT: 0.5 } : { QQQ: 0.5, DIA: 0.5 };
}
