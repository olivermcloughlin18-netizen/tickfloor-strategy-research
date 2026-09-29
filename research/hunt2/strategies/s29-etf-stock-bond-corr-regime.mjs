export const meta = {
  id: "s29-etf-stock-bond-corr-regime",
  name: "Bond or real-asset hedge chosen by the stock-bond correlation sign",
  family: "other",
  source: "Campbell, Pflueger & Viceira 2020 JPE; Ilmanen 2003 JFI (stock-bond correlations)",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "TLT", "DBC", "GLD"],
  rebalance: "monthly",
  params: { window: 63 },
};

export function rank(universe, t, ctx) {
  const n = ctx.params.window;
  const q = universe.QQQ, b = universe.TLT;
  if (!q || !b || q.length < n + 1 || b.length < n + 1) return {};
  const x = [], y = [];
  for (let k = 0; k < n; k++) {
    const iq = q.length - 1 - k, ib = b.length - 1 - k;
    x.push(q[iq].close / q[iq - 1].close - 1);
    y.push(b[ib].close / b[ib - 1].close - 1);
  }
  const mx = x.reduce((a, c) => a + c, 0) / n, my = y.reduce((a, c) => a + c, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let k = 0; k < n; k++) { sxy += (x[k] - mx) * (y[k] - my); sxx += (x[k] - mx) ** 2; syy += (y[k] - my) ** 2; }
  const rho = sxy / Math.sqrt(sxx * syy);
  if (!(rho === rho)) return {};
  if (rho < 0) return { QQQ: 0.6, TLT: 0.4 };
  const w = { QQQ: 0.6 };
  if (universe.DBC) w.DBC = 0.2;
  if (universe.GLD) w.GLD = 0.2;
  return w;
}
