// prereg-2026-09-25 B2: price delay D1 = 1 - R2(restricted)/R2(unrestricted) from 52 weekly
// regressions of the stock's return on the equal-weight market return, with and without 4 lags
// of the market. Hold the N most delayed names.
export const meta = {
  id: "r25-price-delay",
  name: "Price delay (slow response to market news) (wide US stocks)",
  family: "equity-factors",
  source: "Hou & Moskowitz 2005 RFS (market frictions, price delay, and the cross-section of expected returns)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 282, lag: 2, minNames: 50, weeks: 52, lags: 4, step: 5 },
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
function solve(A, v) {
  const n = v.length;
  const m = A.map((row, i) => [...row, v[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (!(Math.abs(m[p][c]) > 1e-12)) return null;
    const tmp = m[c];
    m[c] = m[p];
    m[p] = tmp;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  const x = m.map((row, i) => row[n] / row[i]);
  return x.every(Number.isFinite) ? x : null;
}
function r2(y, X) {
  const P = X[0].length;
  const A = Array.from({ length: P }, () => new Array(P).fill(0));
  const v = new Array(P).fill(0);
  for (let i = 0; i < y.length; i++) {
    for (let a = 0; a < P; a++) {
      v[a] += X[i][a] * y[i];
      for (let c = 0; c < P; c++) A[a][c] += X[i][a] * X[i][c];
    }
  }
  const beta = solve(A, v);
  if (!beta) return NaN;
  const my = y.reduce((p, q) => p + q, 0) / y.length;
  let sst = 0;
  let ssr = 0;
  for (let i = 0; i < y.length; i++) {
    let f = 0;
    for (let a = 0; a < P; a++) f += beta[a] * X[i][a];
    ssr += (y[i] - f) ** 2;
    sst += (y[i] - my) ** 2;
  }
  return sst > 0 ? 1 - ssr / sst : NaN;
}

export function rank(universe, t, ctx) {
  const { need, lag, minNames, weeks, lags, step } = ctx.params;
  const W = weeks + lags;
  const elig = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < need) continue;
    const e = b.length - lag;
    const w = [];
    for (let j = 0; j < W; j++) w.push(b[e - step * j].close / b[e - step * (j + 1)].close - 1);
    if (w.every(Number.isFinite)) elig.push([sym, w]);
  }
  if (elig.length < minNames) return ew(universe);
  const mk = new Array(W).fill(0);
  for (const [, w] of elig) for (let j = 0; j < W; j++) mk[j] += w[j] / elig.length;
  const rows = [];
  for (const [sym, w] of elig) {
    const y = w.slice(0, weeks);
    const Xr = y.map((_, j) => [1, mk[j]]);
    const Xu = y.map((_, j) => [1, mk[j], mk[j + 1], mk[j + 2], mk[j + 3], mk[j + 4]]);
    const rr = r2(y, Xr);
    const ru = r2(y, Xu);
    if (!(ru > 0) || !Number.isFinite(rr)) continue;
    rows.push([sym, 1 - rr / ru]);
  }
  if (rows.length < minNames) return ew(universe);
  const N = Math.max(10, Math.round(0.2 * rows.length));
  const out = {};
  for (const [sym] of order(rows, true).slice(0, N)) out[sym] = 1 / N;
  return out;
}
