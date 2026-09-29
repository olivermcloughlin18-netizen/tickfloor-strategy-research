// prereg r27-crypto-beta-timing (C3, PROMISING track): conditional-beta timing on the
// crypto universe. In BTC "boom" weeks (close above its close 28 bars back), hold the
// K highest-BTC-beta alts EW; otherwise hold BTCUSDT plus the K lowest-beta alts EW.
// K = max(3, round(0.3 * eligible-alt-count)). Falls back to EW-present whenever BTC
// is missing/short, or fewer than 8 total names are eligible.
export const meta = {
  id: "r27-crypto-beta-timing",
  name: "Crypto BTC-beta timing by BTC 4-week trend",
  family: "equity-factors",
  source: "Cederburg & O'Doherty 2016 JF (conditional beta anomaly); Liu & Tsyvinski 2021 RFS; Liu, Tsyvinski & Wu 2022 JF",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "weekly",
  params: { lag: 2, lookback: 28, betaWindow: 90, need: 92, minNames: 8, frac: 0.3 },
};

function ret(b, k) {
  return b[k].close / b[k - 1].close - 1;
}

function cmpSym(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function ewWeights(syms) {
  const w = {};
  const n = syms.length;
  for (const s of syms) w[s] = 1 / n;
  return w;
}

export function rank(universe, t, ctx) {
  const { lookback, betaWindow, need, minNames, frac } = ctx.params;
  const allSyms = Object.keys(universe).sort(cmpSym);

  const btc = universe.BTCUSDT;
  if (!btc || btc.length < need) return ewWeights(allSyms);

  const eBtc = btc.length - 2;

  // BTC's own betaWindow returns (the market series m), on BTC's own bars.
  const m = [];
  for (let k = eBtc - betaWindow + 1; k <= eBtc; k++) {
    const r = ret(btc, k);
    if (!Number.isFinite(r)) return ewWeights(allSyms);
    m.push(r);
  }
  const mMean = m.reduce((a, x) => a + x, 0) / m.length;
  const mVar = m.reduce((a, x) => a + (x - mMean) * (x - mMean), 0) / (m.length - 1);

  const betas = {};
  for (const sym of allSyms) {
    if (sym === "BTCUSDT") continue;
    const b = universe[sym];
    if (!b || b.length < need) continue;
    const e = b.length - 2;
    const rs = [];
    let ok = true;
    for (let k = e - betaWindow + 1; k <= e; k++) {
      const r = ret(b, k);
      if (!Number.isFinite(r)) {
        ok = false;
        break;
      }
      rs.push(r);
    }
    if (!ok) continue;
    const rMean = rs.reduce((a, x) => a + x, 0) / rs.length;
    let cov = 0;
    for (let idx = 0; idx < rs.length; idx++) cov += (rs[idx] - rMean) * (m[idx] - mMean);
    cov /= rs.length - 1;
    const beta = cov / mVar;
    if (!Number.isFinite(beta)) continue;
    betas[sym] = beta;
  }

  const alts = Object.keys(betas);
  if (alts.length + 1 < minNames) return ewWeights(allSyms);

  const K = Math.max(3, Math.round(frac * alts.length));
  const boom = btc[eBtc].close > btc[eBtc - lookback].close;

  let chosen;
  if (boom) {
    // K highest-beta alts; ties broken by symbol ascending.
    const desc = [...alts].sort((a, b) => (betas[b] !== betas[a] ? betas[b] - betas[a] : cmpSym(a, b)));
    chosen = desc.slice(0, K);
  } else {
    // BTCUSDT plus the K lowest-beta alts; ties broken by symbol ascending.
    const asc = [...alts].sort((a, b) => (betas[a] !== betas[b] ? betas[a] - betas[b] : cmpSym(a, b)));
    chosen = ["BTCUSDT", ...asc.slice(0, K)];
  }
  chosen.sort(cmpSym);
  return ewWeights(chosen);
}
