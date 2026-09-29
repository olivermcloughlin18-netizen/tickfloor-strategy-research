// prereg-2026-09-25 B2: market-model residual reversal. Alpha/beta estimated on sessions
// e-251..e-21; score = sum of the last 21 residuals / residual sd in the estimation window.
// Hold the N lowest.
export const meta = {
  id: "r25-residual-reversal",
  name: "Short-term residual reversal (wide US stocks)",
  family: "mean-reversion-statarb",
  source: "Blitz, Huij, Lansdorp & Verbeek 2013 JFM (short-term residual reversal)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 254, lag: 2, minNames: 50, window: 252, recent: 21 },
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
function rets(b, e, n) {
  const r = [];
  for (let k = e - n + 1; k <= e; k++) r.push(b[k].close / b[k - 1].close - 1);
  return r;
}
function eligible(universe, need, lag) {
  const out = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length >= need) out.push([sym, b, b.length - lag]);
  }
  return out;
}
function market(elig, n) {
  const m = new Array(n).fill(0);
  for (const [, b, e] of elig) {
    const r = rets(b, e, n);
    for (let j = 0; j < n; j++) m[j] += r[j] / elig.length;
  }
  return m;
}
const mean = (xs) => xs.reduce((p, q) => p + q, 0) / xs.length;
function hold(rows, n, desc) {
  const out = {};
  for (const [sym] of order(rows, desc).slice(0, n)) out[sym] = 1 / n;
  return out;
}

export function rank(universe, t, ctx) {
  const { need, lag, minNames, window, recent } = ctx.params;
  const elig = eligible(universe, need, lag);
  if (elig.length < minNames) return ew(universe);
  const m = market(elig, window);
  const est = window - recent;
  const me = mean(m.slice(0, est));
  let vm = 0;
  for (let j = 0; j < est; j++) vm += (m[j] - me) ** 2;
  if (!(vm > 0)) return ew(universe);
  const rows = [];
  for (const [sym, b, e] of elig) {
    const r = rets(b, e, window);
    const re = mean(r.slice(0, est));
    let c = 0;
    for (let j = 0; j < est; j++) c += (r[j] - re) * (m[j] - me);
    const beta = c / vm;
    const alpha = re - beta * me;
    const u = r.map((x, j) => x - alpha - beta * m[j]);
    const ue = u.slice(0, est);
    const mu = mean(ue);
    const sd = Math.sqrt(ue.reduce((p, q) => p + (q - mu) ** 2, 0) / (est - 1));
    if (!(sd > 0)) continue;
    const s = u.slice(est).reduce((p, q) => p + q, 0) / sd;
    if (Number.isFinite(s)) rows.push([sym, s]);
  }
  const N = Math.max(10, Math.round(0.2 * rows.length));
  return hold(rows, N, false);
}
