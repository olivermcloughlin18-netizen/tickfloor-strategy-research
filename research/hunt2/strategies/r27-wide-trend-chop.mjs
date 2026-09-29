// Regime switch on the wide US stock universe: Kaufman efficiency ratio (ER) on the equal-weight
// market's own daily-return series decides trend vs chop. Trend -> EW top-N 12-1 momentum
// (Jegadeesh & Titman 1993). Chop -> EW bottom-N 1-month return (short-term reversal, Jegadeesh 1990).
export const meta = {
  id: "r27-wide-trend-chop",
  name: "Stock momentum in trending markets, reversal in choppy ones (wide US stocks)",
  family: "momentum",
  source: "u/GemeriCorp, r/Trading 1wop3th (regime drift); u/ImNotSelling (adapt to conditions); Kaufman 2013; Jegadeesh & Titman 1993; Jegadeesh 1990",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { lag: 2, erWindow: 63, erMin: 0.30, need: 254 },
};

function ewPresent(universe) {
  const syms = Object.keys(universe).sort();
  const w = {};
  for (const s of syms) w[s] = 1 / syms.length;
  return w;
}

function bySymAsc(a, b) {
  return a.sym < b.sym ? -1 : a.sym > b.sym ? 1 : 0;
}

export function rank(universe, t, ctx) {
  const { lag, erWindow, erMin, need } = ctx.params;
  const syms = Object.keys(universe).sort();

  const eligible = [];
  for (const sym of syms) {
    const b = universe[sym];
    const L = b.length;
    if (L < need) continue;
    const e = L - lag;

    const mom12 = b[e - 21].close / b[e - 252].close - 1;
    const rev1m = b[e].close / b[e - 21].close - 1;
    if (!Number.isFinite(mom12) || !Number.isFinite(rev1m)) continue;

    // this name's own contribution to the EW market-return series, r(e - j) for j = 0..erWindow-1
    const rets = new Array(erWindow);
    let ok = true;
    for (let j = 0; j < erWindow; j++) {
      const k = e - j;
      const r = b[k].close / b[k - 1].close - 1;
      if (!Number.isFinite(r)) { ok = false; break; }
      rets[j] = r;
    }
    if (!ok) continue;

    eligible.push({ sym, mom12, rev1m, rets });
  }

  const M = eligible.length;
  if (M < 50) return ewPresent(universe);

  const N = Math.max(10, Math.round(0.2 * M));

  // EW market return at each lag j = mean over eligible names of their own r(e_i - j)
  const m = new Array(erWindow).fill(0);
  for (let j = 0; j < erWindow; j++) {
    let sum = 0;
    for (const it of eligible) sum += it.rets[j];
    m[j] = sum / M;
  }

  let num = 0;
  let den = 0;
  for (let j = 0; j < erWindow; j++) {
    const lg = Math.log(1 + m[j]);
    num += lg;
    den += Math.abs(lg);
  }
  const ER = den === 0 ? 0 : Math.abs(num) / den;
  if (!Number.isFinite(ER)) return ewPresent(universe);

  let selected;
  if (ER >= erMin) {
    selected = eligible.slice().sort((a, b) => {
      if (b.mom12 !== a.mom12) return b.mom12 - a.mom12;
      return bySymAsc(a, b);
    }).slice(0, N);
  } else {
    selected = eligible.slice().sort((a, b) => {
      if (a.rev1m !== b.rev1m) return a.rev1m - b.rev1m;
      return bySymAsc(a, b);
    }).slice(0, N);
  }

  const w = {};
  for (const it of selected) w[it.sym] = 1 / selected.length;
  return w;
}
