export const meta = {
  id: "s29-etf-rrg-leading",
  name: "Relative Rotation Graph: sectors in the leading quadrant",
  family: "momentum",
  source: "de Kempenaer, JdK RS-Ratio and RS-Momentum (Relative Rotation Graphs, Bloomberg/StockCharts)",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "QQQ"],
  rebalance: "weekly",
  params: { ratioWindow: 63, momWindow: 10 },
};

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const q = universe.QQQ;
  const need = p.ratioWindow + p.momWindow - 1; // 72 RS points
  if (!q || q.length < need) return {};
  const qs = q.slice(q.length - need);
  const leading = [];
  for (const s of Object.keys(universe)) {
    if (s === "QQQ" || !meta.assets.includes(s)) continue;
    const b = universe[s];
    const m = new Map();
    for (let k = Math.max(0, b.length - need - 10); k < b.length; k++) m.set(b[k].time, b[k].close);
    const rs = [];
    for (const qb of qs) {
      const c = m.get(qb.time);
      if (c === undefined) break;
      rs.push(c / qb.close);
    }
    if (rs.length < need) continue;
    const rsr = [];
    for (let k = p.ratioWindow - 1; k < rs.length; k++) {
      let sum = 0;
      for (let j = k - p.ratioWindow + 1; j <= k; j++) sum += rs[j];
      rsr.push((100 * rs[k]) / (sum / p.ratioWindow));
    }
    let ms = 0;
    for (const v of rsr) ms += v;
    const rsm = (100 * rsr[rsr.length - 1]) / (ms / rsr.length);
    if (rsr[rsr.length - 1] > 100 && rsm > 100) leading.push(s);
  }
  const w = {};
  for (const s of leading) w[s] = 1 / leading.length;
  return w;
}
