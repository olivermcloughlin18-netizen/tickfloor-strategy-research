// prereg-2026-09-25 B1: hold every stock whose own 12-1 return is positive (absolute, not
// relative, momentum); fewer than 10 such names means equal weight on everything.
export const meta = {
  id: "r25-tsmom-stock",
  name: "Single-stock time-series momentum, long-only (wide US stocks)",
  family: "momentum",
  source: "Lim, Wang & Yao 2018 JBF (time-series momentum in nearly 100 years of stock returns); Moskowitz, Ooi & Pedersen 2012 JFE",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 254, lag: 2, minNames: 50, minHold: 10 },
};

function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}

export function rank(universe, t, ctx) {
  const { need, lag, minNames, minHold } = ctx.params;
  let M = 0;
  const win = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < need) continue;
    const e = b.length - lag;
    const r = b[e - 21].close / b[e - 252].close - 1;
    if (!Number.isFinite(r)) continue;
    M++;
    if (r > 0) win.push(sym);
  }
  if (M < minNames || win.length < minHold) return ew(universe);
  const out = {};
  for (const sym of win) out[sym] = 1 / win.length;
  return out;
}
