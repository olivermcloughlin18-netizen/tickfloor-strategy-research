// Minimum-distance pairs trading (long leg only), wide US-stock universe, monthly.
export const meta = {
  id: "r27-wide-pairs-lo",
  name: "Pairs-trading divergence, long leg only (wide US stocks)",
  family: "mean_reversion",
  source: "Gatev, Goetzmann & Rouwenhorst 2006 RFS 'Pairs trading' (minimum-distance matching); Do & Faff 2010 FAJ. Long leg only.",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { lag: 2, formation: 252, need: 254 },
};

function ewPresent(universe) {
  const keys = Object.keys(universe);
  const w = {};
  for (const sym of keys) w[sym] = 1 / keys.length;
  return w;
}

export function rank(universe, t, ctx) {
  const { lag, formation, need } = ctx.params;
  const eligible = []; // { sym, P: Float64Array(formation) }

  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    const L = b.length;
    if (L < need) continue;
    const e = L - lag;
    const base = b[e - (formation - 1)];
    if (!base) continue;
    const baseClose = base.close;
    if (!Number.isFinite(baseClose) || baseClose === 0) continue;
    const P = new Float64Array(formation);
    let ok = true;
    for (let j = 0; j < formation; j++) {
      const bar = b[e - (formation - 1) + j];
      const v = bar.close / baseClose;
      if (!Number.isFinite(v)) { ok = false; break; }
      P[j] = v;
    }
    if (ok) eligible.push({ sym, P });
  }

  const M = eligible.length;
  if (M < 50) return ewPresent(universe);
  const N = Math.max(10, Math.round(0.2 * M));

  const zRows = [];
  for (let i = 0; i < M; i++) {
    const Pi = eligible[i].P;
    let bestSym = null, bestDist = Infinity, bestP = null;
    for (let k = 0; k < M; k++) {
      if (k === i) continue;
      const Pk = eligible[k].P;
      let dist = 0;
      for (let j = 0; j < formation; j++) { const d = Pi[j] - Pk[j]; dist += d * d; }
      const sym = eligible[k].sym;
      if (dist < bestDist || (dist === bestDist && (bestSym === null || sym < bestSym))) {
        bestDist = dist; bestSym = sym; bestP = Pk;
      }
    }
    if (!bestP) continue;

    const d = new Float64Array(formation);
    let sum = 0;
    for (let j = 0; j < formation; j++) { d[j] = Pi[j] - bestP[j]; sum += d[j]; }
    const meanD = sum / formation;
    let ss = 0;
    for (let j = 0; j < formation; j++) { const x = d[j] - meanD; ss += x * x; }
    const sd = Math.sqrt(ss / (formation - 1));
    if (!(sd > 0)) continue; // skip names with sd 0

    const z = (d[formation - 1] - meanD) / sd;
    if (Number.isFinite(z)) zRows.push({ sym: eligible[i].sym, z });
  }

  if (!zRows.length) return ewPresent(universe);
  zRows.sort((a, b) => a.z - b.z || (a.sym < b.sym ? -1 : a.sym > b.sym ? 1 : 0));
  const winners = zRows.slice(0, Math.min(N, zRows.length));

  const w = {};
  const wt = 1 / winners.length;
  for (const r of winners) w[r.sym] = wt;
  return w;
}
