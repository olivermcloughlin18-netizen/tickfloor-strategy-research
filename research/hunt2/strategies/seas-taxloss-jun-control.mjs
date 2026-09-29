// MATCHED NAIVE CONTROL for seas-taxloss-loser-tilt.
//
// Identical universe, identical lookback (250 bars), identical loser count (17), identical
// tilt fraction (0.5), identical window LENGTH (15th of a month through the end of the next
// month), identical costs, identical benchmark. The ONLY difference is the calendar position:
// 15 Jun - 31 Jul instead of 15 Dec - 31 Jan. If the December tilt does not beat this, the
// effect is deep-loser reversal, not tax-loss selling.

export const meta = {
  id: "seas-taxloss-jun-control",
  name: "MATCHED CONTROL: same deep-loser tilt at a non-tax window (15 Jun - 31 Jul)",
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
    startMonth: 6,
    startDay: 15,
    endMonth: 7,
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
