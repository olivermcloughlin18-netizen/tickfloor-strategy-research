// Dumb floor control for the cross-sectional-dispersion timing family (lane sonnet-5).
// Identical basket and warm-up to xsd-dispersion-gate / xsd-ctrl-volgate, but never gated.
export const meta = {
  id: "xsd-ctrl-always-on",
  name: "Control: always-on equal-weight universe, weekly (no timing gate)",
  family: "breadth-dispersion",
  source: "matched do-nothing control for cross-sectional dispersion timing; hunt lane sonnet-5 2026-09-22",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "weekly",
  params: { lookback: 252, dispWindow: 21, minObs: 30 },
};

export function rank(universe, t, ctx) {
  const L = ctx.params.lookback, MINOBS = ctx.params.minObs;
  const keys = Object.keys(universe);
  // Same warm-up as the gated variants: need L complete cross-sections.
  const byTime = new Map();
  for (const sym of keys) {
    const b = universe[sym];
    const start = Math.max(1, b.length - (L + 8));
    for (let i = start; i < b.length; i++) {
      const p = b[i - 1].close, c = b[i].close;
      if (!(p > 0) || !(c > 0)) continue;
      const a = byTime.get(b[i].time);
      if (a === undefined) byTime.set(b[i].time, 1); else byTime.set(b[i].time, a + 1);
    }
  }
  const times = [];
  for (const k of byTime.keys()) times.push(k);
  times.sort((x, y) => x - y);
  if (times.length < L) return {};
  for (let k = times.length - L; k < times.length; k++) if (byTime.get(times[k]) < MINOBS) return {};

  const n = keys.length;
  if (n === 0) return {};
  const w = {};
  for (const sym of keys) w[sym] = 1 / n;
  return w;
}
