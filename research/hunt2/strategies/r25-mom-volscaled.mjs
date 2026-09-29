// prereg-2026-09-25 B1: 12-1 momentum book blended with the equal-weight book so the
// momentum sleeve targets 10%/yr tracking volatility (Barroso & Santa-Clara 2015).
export const meta = {
  id: "r25-mom-volscaled",
  name: "Volatility-managed 12-1 momentum sleeve (wide US stocks)",
  family: "momentum",
  source: "Barroso & Santa-Clara 2015 JFE; Daniel & Moskowitz 2016 JFE (momentum crashes, risk-managed momentum)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 254, lag: 2, minNames: 50, spreadWindow: 126, target: 0.1 },
};

function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}
function order(rows, desc) {
  return rows.sort((a, b) => (desc ? b[1] - a[1] : a[1] - b[1]) || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

export function rank(universe, t, ctx) {
  const { need, lag, minNames, spreadWindow, target } = ctx.params;
  const elig = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < need) continue;
    const e = b.length - lag;
    const score = b[e - 21].close / b[e - 252].close - 1;
    if (Number.isFinite(score)) elig.push([sym, score, b, e]);
  }
  const M = elig.length;
  if (M < minNames) return ew(universe);
  const N = Math.max(10, Math.round(0.2 * M));
  const mom = order(elig.slice(), true).slice(0, N);
  const r = (x, k) => x[2][x[3] - k].close / x[2][x[3] - k - 1].close - 1;
  const s = [];
  for (let k = spreadWindow - 1; k >= 0; k--) {
    let a = 0;
    let c = 0;
    for (const x of mom) a += r(x, k);
    for (const x of elig) c += r(x, k);
    s.push(a / N - c / M);
  }
  const mean = s.reduce((p, q) => p + q, 0) / s.length;
  const sd = Math.sqrt(s.reduce((p, q) => p + (q - mean) ** 2, 0) / (s.length - 1)) * Math.sqrt(252);
  const w = sd > 0 ? Math.min(1, target / sd) : 1;
  const out = {};
  for (const x of elig) out[x[0]] = (1 - w) / M;
  for (const x of mom) out[x[0]] += w / N;
  return out;
}
