// prereg-2026-09-25 B1: trend factor. Each month, regress next-21-session returns on normalised
// moving averages (MA_L / close - 1, L in 3..200) across names; average the last 12 months'
// slopes; forecast with today's normalised MAs; hold the N highest forecasts.
export const meta = {
  id: "r25-trend-factor",
  name: "Trend factor from normalised moving averages, 12-month average slopes (wide US stocks)",
  family: "trend",
  source: "Han, Zhou & Zhu 2016 JFE (a trend factor); lags above 200 dropped so warm-up fits the window",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 454, lag: 2, minNames: 50, lags: [3, 5, 10, 20, 50, 100, 200], months: 12, horizon: 21 },
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
function feats(b, x, lags) {
  const out = [1];
  let acc = 0;
  let k = 0;
  for (const L of lags) {
    while (k < L) {
      acc += b[x - k].close;
      k++;
    }
    out.push(acc / L / b[x].close - 1);
  }
  return out;
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

export function rank(universe, t, ctx) {
  const { need, lag, minNames, lags, months, horizon } = ctx.params;
  const elig = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length >= need) elig.push([sym, b, b.length - lag]);
  }
  const M = elig.length;
  if (M < minNames) return ew(universe);
  const P = lags.length + 1;
  const avg = new Array(P).fill(0);
  let used = 0;
  for (let j = 1; j <= months; j++) {
    const A = Array.from({ length: P }, () => new Array(P).fill(0));
    const v = new Array(P).fill(0);
    for (const [, b, e] of elig) {
      const x = e - horizon * j;
      const f = feats(b, x, lags);
      const y = b[e - horizon * (j - 1)].close / b[x].close - 1;
      for (let a = 0; a < P; a++) {
        v[a] += f[a] * y;
        for (let c = 0; c < P; c++) A[a][c] += f[a] * f[c];
      }
    }
    const beta = solve(A, v);
    if (!beta) continue;
    for (let a = 0; a < P; a++) avg[a] += beta[a];
    used++;
  }
  if (!used) return ew(universe);
  const rows = [];
  for (const [sym, b, e] of elig) {
    const f = feats(b, e, lags);
    let s = 0;
    for (let a = 1; a < P; a++) s += (avg[a] / used) * f[a];
    if (Number.isFinite(s)) rows.push([sym, s]);
  }
  if (rows.length < minNames) return ew(universe);
  const N = Math.max(10, Math.round(0.2 * rows.length));
  const out = {};
  for (const [sym] of order(rows, true).slice(0, N)) out[sym] = 1 / N;
  return out;
}
