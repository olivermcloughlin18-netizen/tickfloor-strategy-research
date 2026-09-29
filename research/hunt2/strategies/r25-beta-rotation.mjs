// prereg-2026-09-25 B2: when the equal-weight universe index is above its 200-session average hold
// the N highest-beta names, otherwise the N lowest-beta names. Always fully invested.
export const meta = {
  id: "r25-beta-rotation",
  name: "Market-state beta rotation, fully invested (wide US stocks)",
  family: "equity-factors",
  source: "Frazzini & Pedersen 2014 JFE (betting against beta); Cederburg & O'Doherty 2016 JF (conditional beta anomaly)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 254, lag: 2, minNames: 50, window: 252, sma: 200 },
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
  const { need, lag, minNames, window, sma } = ctx.params;
  const elig = eligible(universe, need, lag);
  if (elig.length < minNames) return ew(universe);
  const m = market(elig, window);
  const mm = mean(m);
  const vm = m.reduce((p, q) => p + (q - mm) ** 2, 0);
  if (!(vm > 0)) return ew(universe);
  const rows = [];
  for (const [sym, b, e] of elig) {
    const r = rets(b, e, window);
    const mr = mean(r);
    let c = 0;
    for (let j = 0; j < window; j++) c += (r[j] - mr) * (m[j] - mm);
    if (Number.isFinite(c)) rows.push([sym, c / vm]);
  }
  let level = 1;
  const idx = m.map((x) => (level *= 1 + x));
  const avg = mean(idx.slice(window - sma));
  const N = Math.max(10, Math.round(0.2 * rows.length));
  return hold(rows, N, idx[window - 1] > avg);
}
