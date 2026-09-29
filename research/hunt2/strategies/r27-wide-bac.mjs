export const meta = {
  id: "r27-wide-bac",
  name: "Betting against correlation, long-only (wide US stocks)",
  family: "equity-factors",
  source: "Asness, Frazzini, Gormsen & Pedersen 2020 JFE 'Betting against correlation'",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { lag: 2, window: 252, need: 254 },
};

function equalWeights(universe) {
  const symbols = Object.keys(universe);
  const weights = {};
  for (const symbol of symbols) weights[symbol] = 1 / symbols.length;
  return weights;
}

// EW over the N names whose trailing-year daily returns correlate least with the
// equal-weight market return built from the same eligible names (position-aligned
// per name, not date-aligned).
export function rank(universe, t, ctx) {
  const p = ctx.params;
  const eligible = [];
  const returns = {}; // symbol -> [r(e-0), r(e-1), ..., r(e-(window-1))]

  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    const L = b.length;
    if (L < p.need) continue;
    const e = L - p.lag;
    const arr = new Array(p.window);
    let valid = true;
    for (let j = 0; j < p.window; j++) {
      const k = e - j;
      const c0 = b[k].close;
      const c1 = b[k - 1].close;
      if (!Number.isFinite(c0) || !Number.isFinite(c1) || c1 === 0) { valid = false; break; }
      const r = c0 / c1 - 1;
      if (!Number.isFinite(r)) { valid = false; break; }
      arr[j] = r;
    }
    if (!valid) continue;
    eligible.push(sym);
    returns[sym] = arr;
  }

  const M = eligible.length;
  if (M < 50) return equalWeights(universe);
  const N = Math.max(10, Math.round(0.2 * M));

  const m = new Array(p.window).fill(0);
  for (let j = 0; j < p.window; j++) {
    let sum = 0;
    for (const sym of eligible) sum += returns[sym][j];
    m[j] = sum / M;
  }
  let mMean = 0;
  for (let j = 0; j < p.window; j++) mMean += m[j];
  mMean /= p.window;
  let mVar = 0;
  for (let j = 0; j < p.window; j++) mVar += (m[j] - mMean) * (m[j] - mMean);

  const scores = [];
  for (const sym of eligible) {
    const x = returns[sym];
    let xMean = 0;
    for (let j = 0; j < p.window; j++) xMean += x[j];
    xMean /= p.window;
    let cov = 0;
    let xVar = 0;
    for (let j = 0; j < p.window; j++) {
      const dx = x[j] - xMean;
      const dm = m[j] - mMean;
      cov += dx * dm;
      xVar += dx * dx;
    }
    const denom = Math.sqrt(xVar * mVar);
    const rho = denom > 0 ? cov / denom : 0;
    if (Number.isFinite(rho)) scores.push([sym, rho]);
  }

  if (scores.length < N) return equalWeights(universe);
  scores.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

  const weights = {};
  for (const [sym] of scores.slice(0, N)) weights[sym] = 1 / N;
  return weights;
}
