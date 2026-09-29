// prereg-2026-09-27 mechanism control for r27-wide-factor-mom: the same five sleeves, built the
// same way, but every sleeve always gets 1/5 (no factor-momentum selection).
export const meta = {
  id: "r27-ctrl-factor-allsleeves",
  name: "Control: all five factor sleeves every month, no selection (wide US stocks)",
  family: "deep-validation-control",
  source: "Preregistered mechanism control (prereg-2026-09-27 section 6)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { lag: 2, need: 254 },
};


// Rank names by val (desc=true -> highest first), ties broken by symbol ascending, take first n.
function pickN(list, n, desc) {
  const arr = list.slice().sort((a, b) => {
    const d = desc ? b.val - a.val : a.val - b.val;
    if (d !== 0) return d;
    return a.sym < b.sym ? -1 : a.sym > b.sym ? 1 : 0;
  });
  return arr.slice(0, n).map((x) => x.sym);
}

// Per-symbol eligibility + the metrics every sleeve needs. Returns null if not eligible.
function evalSymbol(b, lag, need) {
  const L = b.length;
  if (L < need) return null;
  const e = L - lag;
  if (e - 252 < 0) return null;
  const rets = new Array(252); // rets[idx] = r(e-251+idx), idx=0..251
  for (let idx = 0; idx < 252; idx++) {
    const k = e - 251 + idx;
    const cur = b[k].close, prev = b[k - 1].close;
    const r = cur / prev - 1;
    if (!Number.isFinite(r)) return null;
    rets[idx] = r;
  }
  const c_e = b[e].close;
  const c_e21 = b[e - 21].close;
  const c_e252 = b[e - 252].close;
  if (!Number.isFinite(c_e) || !Number.isFinite(c_e21) || !Number.isFinite(c_e252)) return null;
  if (!(c_e21 > 0) || !(c_e252 > 0)) return null;
  const mom121 = c_e21 / c_e252 - 1;
  const mom1 = c_e / c_e21 - 1;
  if (!Number.isFinite(mom121) || !Number.isFinite(mom1)) return null;
  let mean = 0;
  for (let idx = 0; idx < 252; idx++) mean += rets[idx];
  mean /= 252;
  let varSum = 0;
  for (let idx = 0; idx < 252; idx++) varSum += (rets[idx] - mean) * (rets[idx] - mean);
  const sd = Math.sqrt(varSum / 251);
  if (!Number.isFinite(sd)) return null;
  let maxHigh = -Infinity;
  for (let k = e - 251; k <= e; k++) {
    const h = b[k].high;
    if (!Number.isFinite(h)) return null;
    if (h > maxHigh) maxHigh = h;
  }
  if (!(maxHigh > 0)) return null;
  const highRatio = c_e / maxHigh;
  if (!Number.isFinite(highRatio)) return null;
  return { e, c_e, mom121, mom1, sd, highRatio, rets };
}

export function rank(universe, t, ctx) {
  const { lag, need } = ctx.params;
  const syms = Object.keys(universe);
  const ewPresent = () => {
    const w = {};
    for (const s of syms) w[s] = 1 / syms.length;
    return w;
  };
  if (syms.length === 0) return {};


  const info = {};
  for (const sym of syms) {
    const r = evalSymbol(universe[sym], lag, need);
    if (r) info[sym] = r;
  }
  const eligibleSyms = Object.keys(info);
  const M = eligibleSyms.length;
  if (M < 50) return ewPresent();

  const N = Math.max(10, Math.round(0.2 * M));

  // Market series m[idx] = mean over eligible names of that name's own return at the same
  // relative window position (idx=0 oldest .. idx=251 most recent). A consistent relabeling of
  // r(e_i - j) so the cov/var pairing below matches the spec exactly.
  const m = new Float64Array(252);
  for (let idx = 0; idx < 252; idx++) {
    let s = 0;
    for (const sym of eligibleSyms) s += info[sym].rets[idx];
    m[idx] = s / M;
  }
  let mMean = 0;
  for (let idx = 0; idx < 252; idx++) mMean += m[idx];
  mMean /= 252;
  let mVar = 0;
  for (let idx = 0; idx < 252; idx++) mVar += (m[idx] - mMean) * (m[idx] - mMean);
  mVar /= 252;
  for (const sym of eligibleSyms) {
    const rets = info[sym].rets;
    let rMean = 0;
    for (let idx = 0; idx < 252; idx++) rMean += rets[idx];
    rMean /= 252;
    let cov = 0;
    for (let idx = 0; idx < 252; idx++) cov += (rets[idx] - rMean) * (m[idx] - mMean);
    cov /= 252;
    info[sym].beta = mVar > 0 ? cov / mVar : 0;
  }

  const S1 = pickN(eligibleSyms.map((s) => ({ sym: s, val: info[s].mom121 })), N, true);
  const S2 = pickN(eligibleSyms.map((s) => ({ sym: s, val: info[s].mom1 })), N, false);
  const S3 = pickN(eligibleSyms.map((s) => ({ sym: s, val: info[s].sd })), N, false);
  const S4 = pickN(eligibleSyms.map((s) => ({ sym: s, val: info[s].highRatio })), N, true);
  const S5 = pickN(eligibleSyms.map((s) => ({ sym: s, val: info[s].beta })), N, false);
  const w = {};
  for (const names of [S1, S2, S3, S4, S5]) {
    const per = 1 / 5 / names.length;
    for (const sym of names) w[sym] = (w[sym] || 0) + per;
  }
  return w;
}
