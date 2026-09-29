export const meta = {
  id: "s29-etf-risk-appetite-index",
  name: "Kumar-Persaud risk appetite index across 25 ETFs",
  family: "sentiment",
  source: "Kumar & Persaud 2002 International Finance ('Pure contagion and investors' shifting risk appetite')",
  assetClass: "etf",
  timeframe: "1d",
  universe: "ETFS_DAILY",
  rebalance: "weekly",
  params: { volWindow: 63, retWindow: 21 },
};

function ranks(x) {
  const idx = x.map((v, k) => k).sort((a, b) => x[a] - x[b]);
  const r = new Array(x.length);
  for (let a = 0; a < idx.length;) {
    let b = a;
    while (b + 1 < idx.length && x[idx[b + 1]] === x[idx[a]]) b++;
    for (let k = a; k <= b; k++) r[idx[k]] = (a + b) / 2 + 1;
    a = b + 1;
  }
  return r;
}

export function rank(universe, t, ctx) {
  const { volWindow: vw, retWindow: rw } = ctx.params;
  const vols = [], rets = [];
  for (const s of Object.keys(universe)) {
    const b = universe[s], L = b.length;
    if (L < vw + 1) continue;
    let m = 0;
    const r = [];
    for (let k = L - vw; k < L; k++) { const x = b[k].close / b[k - 1].close - 1; r.push(x); m += x; }
    m /= vw;
    let ss = 0;
    for (const x of r) ss += (x - m) * (x - m);
    vols.push(Math.sqrt(ss / (vw - 1)));
    rets.push(b[L - 1].close / b[L - 1 - rw].close - 1);
  }
  const n = vols.length;
  if (n < 3) return {};
  const rv = ranks(vols), rr = ranks(rets);
  const mv = (n + 1) / 2;
  let c = 0, sv = 0, sr = 0;
  for (let k = 0; k < n; k++) { c += (rv[k] - mv) * (rr[k] - mv); sv += (rv[k] - mv) ** 2; sr += (rr[k] - mv) ** 2; }
  const rai = sv === 0 || sr === 0 ? 0 : c / Math.sqrt(sv * sr);
  const pick = rai > 0 ? ["QQQ", "XLK", "XLY", "HYG"] : ["TLT", "IEF", "GLD", "XLP"];
  const w = {};
  for (const s of pick) if (universe[s]) w[s] = 0.25;
  return w;
}
