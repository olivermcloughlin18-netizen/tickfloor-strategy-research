export const meta = {
  id: "s29-etf-paa",
  name: "Protective Asset Allocation (breadth-based crash protection)",
  family: "trend",
  source: "Keller & Keuning 2016 SSRN ('Protective Asset Allocation (PAA)')",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "DIA", "XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "VNQ", "GLD", "DBC", "IEF"],
  rebalance: "monthly",
  params: { sma: 252, protection: 2, top: 6 },
};

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const risky = meta.assets.filter((s) => s !== "IEF");
  const N = risky.length;
  const mom = [];
  for (const s of risky) {
    const b = universe[s];
    if (!b || b.length < p.sma) return {};
    let sum = 0;
    for (let k = b.length - p.sma; k < b.length; k++) sum += b[k].close;
    mom.push([s, b[b.length - 1].close / (sum / p.sma) - 1]);
  }
  if (!universe.IEF) return {};
  const n = mom.filter((m) => m[1] > 0).length;
  const n1 = (p.protection * N) / 4;
  const BF = Math.min(1, Math.max(0, (N - n) / (N - n1)));
  mom.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const w = {};
  if (BF > 0) w.IEF = BF;
  if (BF < 1) for (const [s] of mom.slice(0, p.top)) w[s] = (1 - BF) / p.top;
  return w;
}
