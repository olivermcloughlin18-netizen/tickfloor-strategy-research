// Event-conditioned drift, held for the documented drift horizon.
// The catalogue's event-pead-price-gap detects the event on the INTRADAY (open->close)
// move and re-ranks daily, so it holds ~1 day and never measures drift at all.
// This tests the mechanism the literature actually describes: detect the reaction on the
// OVERNIGHT GAP (where an earnings print lands), then hold the cohort a fixed 20 trading
// days with overlapping cohorts. Matched control: event-gapshock-drift-control-mom.mjs
// (identical cohorts, direction from pre-event momentum instead of the gap).

export const meta = {
  id: "event-gapshock-drift-20d",
  name: "Gap-shock event drift, 20-day overlapping cohorts",
  family: "event-driven",
  source: "Bernard & Thomas (1989) JAR; Chan, Jegadeesh & Lakonishok (1996) JF",
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
      // same warm-up as the control, so both trade the identical cohort set
      if (m < volLookback + momLookback + 1) break;

      const a = avgVol(bars, m, volLookback);
      if (!Number.isFinite(a) || a <= 0) continue;
      const vol = bars[m].volume;
      if (!(vol > volMult * a)) continue;

      const prevClose = bars[m - 1].close;
      if (!(prevClose > 0)) continue;
      const gap = (bars[m].open - prevClose) / prevClose;
      if (!Number.isFinite(gap) || Math.abs(gap) < gapThreshold) continue;

      // direction: the event-day reaction itself
      if (gap > 0) longs.push(sym);
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
