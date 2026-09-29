// prereg-2026-09-25 B2: downside beta (beta estimated on down-market days only, 252 sessions);
// hold the N highest, as the paper's downside-risk premium predicts.
export const meta = {
  id: "r25-downside-beta-high",
  name: "High downside beta (wide US stocks)",
  family: "equity-factors",
  source: "Ang, Chen & Xing 2006 RFS (downside risk)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 254, lag: 2, minNames: 50, window: 252, minDown: 60 },
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
  const { need, lag, minNames, window, minDown } = ctx.params;
  const elig = eligible(universe, need, lag);
  if (elig.length < minNames) return ew(universe);
  const m = market(elig, window);
  const down = [];
  for (let j = 0; j < window; j++) if (m[j] < 0) down.push(j);
  if (down.length < minDown) return ew(universe);
  const md = mean(down.map((j) => m[j]));
  const vm = down.reduce((p, j) => p + (m[j] - md) ** 2, 0);
  if (!(vm > 0)) return ew(universe);
  const rows = [];
  for (const [sym, b, e] of elig) {
    const r = rets(b, e, window);
    const rd = mean(down.map((j) => r[j]));
    let c = 0;
    for (const j of down) c += (r[j] - rd) * (m[j] - md);
    if (Number.isFinite(c)) rows.push([sym, c / vm]);
  }
  const N = Math.max(10, Math.round(0.2 * rows.length));
  return hold(rows, N, true);
}
