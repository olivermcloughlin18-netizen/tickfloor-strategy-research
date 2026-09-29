// HYPOTHESIS (lane sonnet-5): cross-sectional return dispersion is a timing signal, not just a
// descriptive stat — hold the equal-weight universe only when the 21-session mean of the daily
// cross-sectional standard deviation of returns is at or below its own trailing 252-session median,
// otherwise hold cash. Direction from Maio (2016) / Stivers & Sun: high return dispersion forecasts
// LOW subsequent equity returns. Matched controls: xsd-ctrl-always-on, xsd-ctrl-volgate.
export const meta = {
  id: "xsd-dispersion-gate",
  name: "Cross-sectional return dispersion as an equity timing gate",
  family: "breadth-dispersion",
  source: "Maio (2016) cross-sectional return dispersion and the equity premium; Stivers & Sun (2010); hunt lane sonnet-5 2026-09-22",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "weekly",
  params: { lookback: 252, dispWindow: 21, minObs: 30 },
};

export function rank(universe, t, ctx) {
  const L = ctx.params.lookback, W = ctx.params.dispWindow, MINOBS = ctx.params.minObs;
  const keys = Object.keys(universe);

  // day -> { sum of returns, sum of squares, count } across the whole cross-section
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

  const disp = new Array(L);
  for (let k = 0; k < L; k++) {
    const a = byTime.get(times[times.length - L + k]);
    if (a.n < MINOBS) return {};          // never let a short cross-section poison the window
    const m = a.s / a.n;
    const v = (a.q - a.n * m * m) / (a.n - 1);
    disp[k] = Math.sqrt(v > 0 ? v : 0);
  }

  let d = 0;
  for (let k = L - W; k < L; k++) d += disp[k];
  d /= W;
  const sorted = disp.slice().sort((x, y) => x - y);
  const med = sorted[L >> 1];
  if (!(d <= med)) return {};             // dispersion elevated -> risk off

  const n = keys.length;
  if (n === 0) return {};
  const w = {};
  for (const sym of keys) w[sym] = 1 / n;
  return w;
}
