// prereg C5: sector regime switch. Kaufman efficiency ratio on the cross-sectional average
// daily return decides trend vs chop; trend -> top-3 by 6-month momentum, chop -> bottom-3
// by 1-month return (reversal).
export const meta = {
  id: "r27-sector-trend-chop",
  name: "Sector momentum in trending markets, reversal in choppy ones",
  family: "momentum",
  source:
    "u/GemeriCorp, r/Trading 1wop3th (regime drift); Kaufman 2013 (efficiency ratio); Moskowitz & Grinblatt 1999; Jegadeesh 1990",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "XLC", "VNQ"],
  rebalance: "monthly",
  params: { lag: 2, erWindow: 63, erMin: 0.30, momLookback: 126, revLookback: 21, need: 128, top: 3, minNames: 6 },
};

function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}

export function rank(universe, t, ctx) {
  const { lag, erWindow, erMin, momLookback, revLookback, need, top, minNames } = ctx.params;
  const symbols = Object.keys(universe);

  // Eligible = L >= need and every r(e-j), j=0..erWindow-1, is finite.
  const eligible = [];
  for (const sym of symbols) {
    const b = universe[sym];
    if (b.length < need) continue;
    const e = b.length - lag;
    const rs = new Array(erWindow);
    let ok = true;
    for (let j = 0; j < erWindow; j++) {
      const k = e - j;
      const r = b[k].close / b[k - 1].close - 1;
      if (!Number.isFinite(r)) { ok = false; break; }
      rs[j] = r;
    }
    if (ok) eligible.push({ sym, e, rs });
  }

  if (eligible.length < minNames) return ew(universe);

  // m_j = mean over eligible sectors of r(e_s - j).
  const m = new Array(erWindow);
  for (let j = 0; j < erWindow; j++) {
    let sum = 0;
    for (const s of eligible) sum += s.rs[j];
    m[j] = sum / eligible.length;
  }

  let net = 0;
  let path = 0;
  for (let j = 0; j < erWindow; j++) {
    const lg = Math.log(1 + m[j]);
    net += lg;
    path += Math.abs(lg);
  }
  const er = Math.abs(net) / path;

  const bySym = (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  const rows = [];
  if (er >= erMin) {
    for (const s of eligible) {
      const b = universe[s.sym];
      rows.push([s.sym, b[s.e].close / b[s.e - momLookback].close - 1]);
    }
    rows.sort((a, b) => b[1] - a[1] || bySym(a, b));
  } else {
    for (const s of eligible) {
      const b = universe[s.sym];
      rows.push([s.sym, b[s.e].close / b[s.e - revLookback].close - 1]);
    }
    rows.sort((a, b) => a[1] - b[1] || bySym(a, b));
  }

  const w = {};
  for (const [sym] of rows.slice(0, top)) w[sym] = 1 / top;
  return w;
}
