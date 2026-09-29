// prereg-2026-09-25 B1: 12-1 momentum measured on the overnight (close-to-open) component only.
export const meta = {
  id: "r25-overnight-mom",
  name: "Overnight-return 12-1 momentum (wide US stocks)",
  family: "momentum",
  source: "Lou, Polk & Skouras 2019 JFE (a tug of war: overnight versus intraday expected returns)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 254, lag: 2, minNames: 50, from: 251, to: 21, minValid: 200 },
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

export function rank(universe, t, ctx) {
  const { need, lag, minNames, from, to, minValid } = ctx.params;
  const elig = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < need) continue;
    const e = b.length - lag;
    let s = 0;
    let n = 0;
    for (let k = e - from; k <= e - to; k++) {
      const o = b[k].open;
      const pc = b[k - 1].close;
      if (o > 0 && pc > 0 && o >= b[k].low && o <= b[k].high) {
        s += Math.log(o / pc);
        n++;
      }
    }
    if (n >= minValid && Number.isFinite(s)) elig.push([sym, s]);
  }
  const M = elig.length;
  if (M < minNames) return ew(universe);
  const N = Math.max(10, Math.round(0.2 * M));
  const out = {};
  for (const [sym] of order(elig, true).slice(0, N)) out[sym] = 1 / N;
  return out;
}
