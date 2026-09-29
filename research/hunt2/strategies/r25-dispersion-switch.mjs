// prereg-2026-09-25 B1: when cross-sectional return dispersion is above its trailing 12-month
// median hold 1-month losers (reversal), otherwise hold 12-1 winners. Never in cash.
export const meta = {
  id: "r25-dispersion-switch",
  name: "Dispersion-conditioned momentum versus reversal (wide US stocks)",
  family: "momentum",
  source: "Stivers & Sun 2010 JFQA (return dispersion negatively predicts the momentum premium)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 276, lag: 2, minNames: 50, months: 12 },
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
function sd(xs) {
  const m = xs.reduce((p, q) => p + q, 0) / xs.length;
  return Math.sqrt(xs.reduce((p, q) => p + (q - m) ** 2, 0) / (xs.length - 1));
}

export function rank(universe, t, ctx) {
  const { need, lag, minNames, months } = ctx.params;
  const elig = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < need) continue;
    const e = b.length - lag;
    const r21 = [];
    for (let j = 0; j <= months; j++) r21.push(b[e - 21 * j].close / b[e - 21 * (j + 1)].close - 1);
    const mom = b[e - 21].close / b[e - 252].close - 1;
    if (Number.isFinite(mom) && r21.every(Number.isFinite)) elig.push({ sym, r21, mom });
  }
  const M = elig.length;
  if (M < minNames) return ew(universe);
  const N = Math.max(10, Math.round(0.2 * M));
  const disp = [];
  for (let j = 0; j <= months; j++) disp.push(sd(elig.map((x) => x.r21[j])));
  const past = disp.slice(1).sort((a, b) => a - b);
  const mid = past.length >> 1;
  const median = past.length % 2 ? past[mid] : (past[mid - 1] + past[mid]) / 2;
  const rows = disp[0] > median ? order(elig.map((x) => [x.sym, x.r21[0]]), false) : order(elig.map((x) => [x.sym, x.mom]), true);
  const out = {};
  for (const [sym] of rows.slice(0, N)) out[sym] = 1 / N;
  return out;
}
