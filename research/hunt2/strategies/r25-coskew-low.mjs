// prereg-2026-09-25 B2: coskewness with the equal-weight universe (market-model residuals,
// 252 sessions); hold the N most negative.
export const meta = {
  id: "r25-coskew-low",
  name: "Low (negative) coskewness (wide US stocks)",
  family: "volatility",
  source: "Harvey & Siddique 2000 JF (conditional skewness in asset pricing tests)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 254, lag: 2, minNames: 50, window: 252 },
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
  const { need, lag, minNames, window } = ctx.params;
  const elig = eligible(universe, need, lag);
  if (elig.length < minNames) return ew(universe);
  const m = market(elig, window);
  const mm = mean(m);
  const em = m.map((x) => x - mm);
  const vm = em.reduce((p, q) => p + q * q, 0);
  const m2 = vm / window;
  if (!(vm > 0)) return ew(universe);
  const rows = [];
  for (const [sym, b, e] of elig) {
    const r = rets(b, e, window);
    const mr = mean(r);
    let c = 0;
    for (let j = 0; j < window; j++) c += (r[j] - mr) * em[j];
    const beta = c / vm;
    let num = 0;
    let s2 = 0;
    for (let j = 0; j < window; j++) {
      const u = r[j] - mr - beta * em[j];
      num += u * em[j] * em[j];
      s2 += u * u;
    }
    if (!(s2 > 0)) continue;
    const cs = num / window / (Math.sqrt(s2 / window) * m2);
    if (Number.isFinite(cs)) rows.push([sym, cs]);
  }
  const N = Math.max(10, Math.round(0.2 * rows.length));
  return hold(rows, N, false);
}
