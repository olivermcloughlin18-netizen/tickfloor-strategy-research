// Tax-loss window cross-sectional loser tilt.
//
// HYPOTHESIS: US equities with the deepest trailing-250-trading-day losses are depressed by
// tax-motivated selling into the year end, so overweighting them from 15 Dec through 31 Jan
// beats the same overweight applied at a calendar-matched non-tax window (15 Jun - 31 Jul).
//
// Mechanism NOT covered by the catalogue: calendar-january-effect-smallcap is an index-level
// IWM-vs-SPY bet; equity-factors-short-term-reversal is an unconditional monthly reversal.
// This is a conditional cross-sectional loser tilt gated on the tax calendar.
//
// Base book is always the equal-weight universe (= the benchmark), so exposure is ~1.0 all year
// and `excess` measures the tilt itself, not a cash drag.

export const meta = {
  id: "seas-taxloss-loser-tilt",
  name: "Tax-loss window (15 Dec - 31 Jan) deep-loser tilt, US equities",
  family: "seasonality",
  source: "Tax-loss selling: Branch (1977), Roll (1983), Grinblatt & Moskowitz (2004) December loser reversal",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "daily",
  params: {
    lookbackBars: 250,
    loserCount: 17,
    tiltFraction: 0.5,
    startMonth: 12,
    startDay: 15,
    endMonth: 1,
    endDay: 31,
  },
};

function inWindow(t, p) {
  const d = new Date(t * 1000);
  const mo = d.getUTCMonth() + 1;
  const dy = d.getUTCDate();
  if (mo === p.startMonth && dy >= p.startDay) return true;
  if (mo === p.endMonth && dy <= p.endDay) return true;
  return false;
}

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const syms = Object.keys(universe);
  const n = syms.length;
  if (!n) return {};

  const w = {};
  const flat = () => { for (const s of syms) w[s] = 1 / n; return w; };
  if (!inWindow(t, p)) return flat();

  // deepest trailing-lookbackBars losers
  const scored = [];
  for (const s of syms) {
    const b = universe[s];
    if (b.length < p.lookbackBars + 1) continue;
    const now = b[b.length - 1].close;
    const then = b[b.length - 1 - p.lookbackBars].close;
    if (!(now > 0) || !(then > 0)) continue;
    scored.push([s, now / then - 1]);
  }
  if (scored.length < p.loserCount) return flat();  // not enough history: full equal-weight book
  for (const s of syms) w[s] = (1 - p.tiltFraction) / n;
  scored.sort((a, b) => (a[1] - b[1]) || (a[0] < b[0] ? -1 : 1));
  const k = p.loserCount;
  const add = p.tiltFraction / k;
  for (let j = 0; j < k; j++) w[scored[j][0]] += add;
  return w;
}
