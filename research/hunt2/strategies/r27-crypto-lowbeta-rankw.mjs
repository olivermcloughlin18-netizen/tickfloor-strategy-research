// prereg C3 r27: rank-weighted BAB construction on crypto BTC-beta. Near-miss follow-up of
// r25-crypto-btcbeta-low (p = 0.008): instead of an equal-weight low-beta basket, rank every
// eligible coin (BTC + alts) by beta descending and weight by rank so low-beta names get more.
export const meta = {
  id: "r27-crypto-lowbeta-rankw",
  name: "Crypto rank-weighted low BTC beta, monthly",
  family: "equity-factors",
  source: "Frazzini & Pedersen 2014 JFE (rank-weighted BAB construction). Near-miss follow-up of r25-crypto-btcbeta-low (p = 0.008); a new test in the family.",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "monthly",
  params: { lag: 2, betaWindow: 90, need: 92, minNames: 8 },
};

function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}

export function rank(universe, t, ctx) {
  const { lag, betaWindow, need, minNames } = ctx.params;
  const btc = universe.BTCUSDT;
  if (!btc || btc.length < need) return ew(universe);

  const rets = (b) => {
    const e = b.length - lag;
    const r = [];
    for (let k = e - betaWindow + 1; k <= e; k++) r.push(b[k].close / b[k - 1].close - 1);
    return r;
  };
  const m = rets(btc);
  const mm = m.reduce((p, q) => p + q, 0) / betaWindow;
  const vm = m.reduce((p, q) => p + (q - mm) ** 2, 0) / (betaWindow - 1);
  if (!(vm > 0) || !Number.isFinite(vm)) return ew(universe);

  const rows = [["BTCUSDT", 1]];
  for (const sym of Object.keys(universe)) {
    if (sym === "BTCUSDT") continue;
    const b = universe[sym];
    if (b.length < need) continue;
    const r = rets(b);
    if (!r.every(Number.isFinite)) continue;
    const mr = r.reduce((p, q) => p + q, 0) / betaWindow;
    let cov = 0;
    for (let j = 0; j < betaWindow; j++) cov += (r[j] - mr) * (m[j] - mm);
    cov /= betaWindow - 1;
    const beta = cov / vm;
    if (Number.isFinite(beta)) rows.push([sym, beta]);
  }
  if (rows.length < minNames) return ew(universe);

  rows.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const n = rows.length;
  const sumQ = (n * (n + 1)) / 2;
  const out = {};
  rows.forEach(([sym], idx) => {
    out[sym] = (idx + 1) / sumQ;
  });
  return out;
}
