// prereg-2026-09-25 B2: 1-month cross-sectional reversal only when VIX (FRED VIXCLS, known by
// the rebalance close) is above 20; otherwise equal weight. Never in cash.
export const meta = {
  id: "r25-vix-reversal",
  name: "VIX-conditioned 1-month reversal, equal weight otherwise (wide US stocks)",
  family: "mean-reversion-statarb",
  source: "Nagel 2012 RFS (evaporating liquidity: reversal returns rise with VIX)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 23, lag: 2, minNames: 50, lookback: 21, vixAbove: 20 },
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
  const { need, lag, minNames, lookback, vixAbove } = ctx.params;
  const v = ctx.macro("VIXCLS");
  if (v === null || !Number.isFinite(v) || v <= vixAbove) return ew(universe);
  const elig = eligible(universe, need, lag);
  if (elig.length < minNames) return ew(universe);
  const rows = [];
  for (const [sym, b, e] of elig) {
    const r = b[e].close / b[e - lookback].close - 1;
    if (Number.isFinite(r)) rows.push([sym, r]);
  }
  const N = Math.max(10, Math.round(0.2 * rows.length));
  return hold(rows, N, false);
}
