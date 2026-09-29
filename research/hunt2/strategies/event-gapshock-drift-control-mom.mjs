// MATCHED NAIVE CONTROL for event-gapshock-drift-20d.
// Identical event detection (volume shock + >=3% overnight gap), identical 20-day
// overlapping-cohort hold, identical weighting, identical costs, identical benchmark.
// The ONLY difference: the direction comes from pre-event 21-day momentum, which
// contains no information about the event-day reaction. If the real strategy cannot
// beat this, the event-day reaction direction carries nothing beyond plain momentum.

export const meta = {
  id: "event-gapshock-drift-control-mom",
  name: "Control: gap-shock cohorts, direction from pre-event momentum",
  family: "event-driven",
  source: "Matched naive control for Bernard & Thomas (1989) PEAD drift-hold test",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_DAILY",
  rebalance: "daily",
  longShort: true,
  params: { volMult: 3.0, gapThreshold: 0.03, holdDays: 20, volLookback: 60, momLookback: 21 },
};

function avgVol(bars, m, n) {
  let s = 0;
  for (let k = m - n; k < m; k++) {
    const v = bars[k].volume;
    if (!(v > 0) || !Number.isFinite(v)) return NaN;
    s += v;
  }
  return s / n;
}

export function rank(universe, t, ctx) {
  const { volMult, gapThreshold, holdDays, volLookback, momLookback } = ctx.params;
  const longs = [];
  const shorts = [];

  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];
    const last = bars.length - 1;

    for (let d = 0; d < holdDays; d++) {
      const m = last - d;
      if (m < volLookback + momLookback + 1) break;

      const a = avgVol(bars, m, volLookback);
      if (!Number.isFinite(a) || a <= 0) continue;
      const vol = bars[m].volume;
      if (!(vol > volMult * a)) continue;

      const prevClose = bars[m - 1].close;
      if (!(prevClose > 0)) continue;
      const gap = (bars[m].open - prevClose) / prevClose;
      if (!Number.isFinite(gap) || Math.abs(gap) < gapThreshold) continue;

      // direction: pre-event momentum only (knows nothing about the event reaction)
      const base = bars[m - 1 - momLookback].close;
      if (!(base > 0)) break;
      const mom = prevClose / base - 1;
      if (!Number.isFinite(mom) || mom === 0) break;

      if (mom > 0) longs.push(sym);
      else shorts.push(sym);
      break; // most recent event only
    }
  }

  const w = {};
  if (longs.length > 0) {
    const wl = 0.5 / longs.length;
    for (const s of longs) w[s] = wl;
  }
  if (shorts.length > 0) {
    const ws = -0.5 / shorts.length;
    for (const s of shorts) w[s] = ws;
  }
  return w;
}
