// MATCHED MECHANISM CONTROL for xsd-dispersion-gate (lane sonnet-5).
// Byte-for-byte the same gate shape — a 21-session mean of a daily non-negative scalar compared to
// its own trailing 252-session median, same universe, same weekly frequency, same basket, same costs,
// same benchmark — except the scalar is the market's own daily magnitude |mean cross-sectional return|
// instead of the cross-sectional standard deviation. It answers the only question that matters:
// does dispersion add anything beyond "the market has been moving a lot lately, get out"?
export const meta = {
  id: "xsd-ctrl-volgate",
  name: "Control: realized market-move gate (same shape, vol instead of dispersion)",
  family: "breadth-dispersion",
  source: "matched naive control for cross-sectional dispersion timing; hunt lane sonnet-5 2026-09-22",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "weekly",
  params: { lookback: 252, dispWindow: 21, minObs: 30 },
};

export function rank(universe, t, ctx) {
  const L = ctx.params.lookback, W = ctx.params.dispWindow, MINOBS = ctx.params.minObs;
  const keys = Object.keys(universe);

  const byTime = new Map();
  for (const sym of keys) {
    const b = universe[sym];
    const start = Math.max(1, b.length - (L + 8));
    for (let i = start; i < b.length; i++) {
      const p = b[i - 1].close, c = b[i].close;
      if (!(p > 0) || !(c > 0)) continue;
      const r = c / p - 1;
      let a = byTime.get(b[i].time);
      if (a === undefined) { a = { s: 0, q: 0, n: 0 }; byTime.set(b[i].time, a); }
      a.s += r; a.q += r * r; a.n += 1;
    }
  }
  const times = [];
  for (const k of byTime.keys()) times.push(k);
  times.sort((x, y) => x - y);
  if (times.length < L) return {};

  const mag = new Array(L);
  for (let k = 0; k < L; k++) {
    const a = byTime.get(times[times.length - L + k]);
    if (a.n < MINOBS) return {};
    mag[k] = Math.abs(a.s / a.n);
  }

  let v = 0;
  for (let k = L - W; k < L; k++) v += mag[k];
  v /= W;
  const sorted = mag.slice().sort((x, y) => x - y);
  const med = sorted[L >> 1];
  if (!(v <= med)) return {};

  const n = keys.length;
  if (n === 0) return {};
  const w = {};
  for (const sym of keys) w[sym] = 1 / n;
  return w;
}
