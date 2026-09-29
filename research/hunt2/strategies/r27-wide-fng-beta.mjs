// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "r27-wide-fng-beta",
  name: "Stock beta tilt against crypto Fear & Greed extremes (wide US stocks)",
  family: "sentiment",
  source: "Baker & Wurgler 2006 JF; Stambaugh, Yu & Yuan 2012 JFE (speculative overpricing is stronger after high sentiment). Crypto Fear & Greed as a proxy for retail risk appetite is a weak, cross-asset prior.",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { lag: 2, greed: 75, fear: 25, need: 254 },
};

// r(k) = b[k].close / b[k-1].close - 1.
function ret(b, k) {
  const v = b[k].close / b[k - 1].close - 1;
  return Number.isFinite(v) ? v : NaN;
}

// EW present: weight 1/n on each of the n symbols in universe that day.
function ewPresent(universe) {
  const names = Object.keys(universe);
  const w = {};
  for (const s of names) w[s] = 1 / names.length;
  return w;
}

// PORTFOLIO (cross-sectional): universe[SYMBOL] = bars up to and including date t.
// e = L - lag is the last bar the signal may use (session before the rebalance session;
// the harness fills at the rebalance close). No lookahead: only bars up to b[e] are read.
export function rank(universe, t, ctx) {
  const p = ctx.params;
  const W = 252; // market series window, j = 0..251

  // Eligible = L >= need and every value used (r(e-j) for j=0..251) is finite.
  const elig = []; // { sym, e, r: [252] } r[j] = symbol's own r(e - j)
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    const L = b.length;
    if (L < p.need) continue;
    const e = L - p.lag;
    const r = new Array(W);
    let ok = true;
    for (let j = 0; j < W; j++) {
      const v = ret(b, e - j);
      if (!Number.isFinite(v)) { ok = false; break; }
      r[j] = v;
    }
    if (!ok) continue;
    elig.push({ sym, r });
  }

  const M = elig.length;
  if (M < 50) return ewPresent(universe);

  const N = Math.max(10, Math.round(0.2 * M));

  // EW market return at lag j = mean over eligible names of r(e_i - j), each from its own bars.
  const m = new Array(W).fill(0);
  for (const { r } of elig) for (let j = 0; j < W; j++) m[j] += r[j];
  for (let j = 0; j < W; j++) m[j] /= M;

  let mMean = 0;
  for (let j = 0; j < W; j++) mMean += m[j];
  mMean /= W;
  let varM = 0;
  for (let j = 0; j < W; j++) varM += (m[j] - mMean) * (m[j] - mMean);
  varM /= W;
  if (!Number.isFinite(varM) || varM === 0) return ewPresent(universe);

  const scored = [];
  for (const { sym, r } of elig) {
    let rMean = 0;
    for (let j = 0; j < W; j++) rMean += r[j];
    rMean /= W;
    let cov = 0;
    for (let j = 0; j < W; j++) cov += (r[j] - rMean) * (m[j] - mMean);
    cov /= W;
    const beta = cov / varM;
    if (!Number.isFinite(beta)) continue;
    scored.push({ sym, beta });
  }
  if (scored.length < N) return ewPresent(universe);

  const f = ctx.macro("FNG");
  let picked;
  if (f !== null && f >= p.greed) {
    scored.sort((a, b) => a.beta - b.beta || (a.sym < b.sym ? -1 : a.sym > b.sym ? 1 : 0));
    picked = scored.slice(0, N);
  } else if (f !== null && f <= p.fear) {
    scored.sort((a, b) => b.beta - a.beta || (a.sym < b.sym ? -1 : a.sym > b.sym ? 1 : 0));
    picked = scored.slice(0, N);
  } else {
    return ewPresent(universe);
  }

  const w = {};
  for (const s of picked) w[s.sym] = 1 / picked.length;
  return w;
}
