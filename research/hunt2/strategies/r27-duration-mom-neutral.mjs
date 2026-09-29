// prereg C4: near-miss follow-up of r25-duration-mom-6040 (p = 0.002), which held 60% QQQ
// against a 25% benchmark share. Here the QQQ share matches the benchmark (25%), so only the
// duration-momentum bond-sleeve choice is tested.
export const meta = {
  id: "r27-duration-mom-neutral",
  name: "25% QQQ plus 75% in the best 6-month bond ETF",
  family: "momentum",
  source:
    "Moskowitz, Ooi & Pedersen 2012 JFE; Asness, Moskowitz & Pedersen 2013 JF. Near-miss follow-up of r25-duration-mom-6040 (p = 0.002), which held 60% QQQ against a 25% benchmark share; 25% here matches the benchmark, so only the duration choice is tested. A new test.",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "TLT", "IEF", "SHY"],
  rebalance: "monthly",
  params: { lag: 2, lookback: 126, need: 128 },
};

const SLEEVE = ["TLT", "IEF", "SHY"];

function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}

export function rank(universe, t, ctx) {
  const { lag, lookback, need } = ctx.params;
  const syms = Object.keys(universe);
  if (!syms.includes("QQQ") || !SLEEVE.every((s) => syms.includes(s))) return ew(universe);
  for (const s of SLEEVE) {
    if (universe[s].length < need) return ew(universe);
  }
  const rows = [];
  for (const s of SLEEVE) {
    const b = universe[s];
    const e = b.length - lag;
    const r = b[e].close / b[e - lookback].close - 1;
    if (!Number.isFinite(r)) return ew(universe);
    rows.push([s, r]);
  }
  rows.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return { QQQ: 0.25, [rows[0][0]]: 0.75 };
}
