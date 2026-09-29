export const meta = {
  id: "r27-wide-volofvol-low",
  name: "Low volatility-of-volatility (wide US stocks)",
  family: "volatility",
  source: "Baltussen, van Bekkum & van der Grient 2018 JFQA 'Unknown unknowns: uncertainty about risk and stock returns' (they use implied vol-of-vol; realized is a proxy)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { lag: 2, blocks: 12, blockLen: 21, need: 254 },
};

function equalWeights(universe) {
  const symbols = Object.keys(universe);
  const weights = {};
  for (const symbol of symbols) weights[symbol] = 1 / symbols.length;
  return weights;
}

function sampleSD(arr) {
  const n = arr.length;
  let mean = 0;
  for (const x of arr) mean += x;
  mean /= n;
  let v = 0;
  for (const x of arr) v += (x - mean) * (x - mean);
  return Math.sqrt(v / (n - 1));
}

// EW over the N eligible names with the lowest vol-of-vol: 12 trailing 21-session blocks of daily
// returns, s_q = sample sd of returns within block q, vov = sample sd(s_1..s_12) / mean(s_1..s_12).
export function rank(universe, t, ctx) {
  const p = ctx.params;
  const need = 252 + p.lag; // e-251..e daily returns need b[e-252]; guarded against p.need below too
  const scores = []; // [sym, vov]

  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    const L = b.length;
    if (L < p.need || L < need) continue;
    const e = L - p.lag;

    // r(k) for k = e-251 .. e, position-aligned against this symbol's own bars.
    const offset = e - 251;
    const rets = new Array(252);
    let valid = true;
    for (let idx = 0; idx < 252 && valid; idx++) {
      const k = offset + idx;
      const c0 = b[k].close;
      const c1 = b[k - 1].close;
      if (!Number.isFinite(c0) || !Number.isFinite(c1) || c1 === 0) { valid = false; break; }
      const r = c0 / c1 - 1;
      if (!Number.isFinite(r)) { valid = false; break; }
      rets[idx] = r;
    }
    if (!valid) continue;

    const blockSDs = [];
    for (let q = 1; q <= p.blocks; q++) {
      const kHi = e - p.blockLen * (q - 1);
      const kLo = e - p.blockLen * q + 1;
      const vals = [];
      for (let k = kLo; k <= kHi; k++) vals.push(rets[k - offset]);
      blockSDs.push(sampleSD(vals));
    }
    let vovMean = 0;
    for (const s of blockSDs) vovMean += s;
    vovMean /= p.blocks;
    const vov = sampleSD(blockSDs) / vovMean;
    if (!Number.isFinite(vov)) continue;
    scores.push([sym, vov]);
  }

  const M = scores.length;
  if (M < 50) return equalWeights(universe);
  const N = Math.max(10, Math.round(0.2 * M));

  scores.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

  const weights = {};
  for (const [sym] of scores.slice(0, N)) weights[sym] = 1 / N;
  return weights;
}
