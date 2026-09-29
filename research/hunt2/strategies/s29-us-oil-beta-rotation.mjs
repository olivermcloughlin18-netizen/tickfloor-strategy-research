export const meta = {
  id: "s29-us-oil-beta-rotation",
  name: "Oil-beta stock tilt following the oil trend",
  family: "other",
  source: "Driesprong, Jacobsen & Maat 2008 JFE; Narayan & Sharma 2011 JBF (firm returns, oil and oil-price sensitivity)",
  assetClass: "us_stock",
  timeframe: "1d",
  assets: ["AAPL","NVDA","AMZN","GOOGL","META","TSLA","JPM","V","UNH","XOM","JNJ","COST","ABBV","MRK","AVGO","CVX","WMT","BAC","ORCL","ADBE","CRM","NFLX","AMD","INTC","ABT","MCD","DIS","QCOM","TXN","HON","CAT","LOW","SBUX","BA","UPS","PFE","T","MDT","UNP","MMM"],
  rebalance: "weekly",
  params: { betaWeeks: 104, minWeeks: 52, trendWeeks: 13, top: 8 },
};

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const s = ctx.state;
  if (s.o === undefined) { s.o = []; s.c = {}; }
  const w = s.o.length;
  const o = ctx.macro("DCOILWTICO");
  s.o.push(o === null || !(o > 0) ? NaN : o);
  const syms = Object.keys(universe);
  for (const sym of syms) {
    if (!s.c[sym]) s.c[sym] = [];
    const arr = s.c[sym];
    while (arr.length < w) arr.push(NaN);
    arr.push(universe[sym][universe[sym].length - 1].close);
  }
  for (const sym of Object.keys(s.c)) { const arr = s.c[sym]; while (arr.length < w + 1) arr.push(NaN); }
  if (w < p.trendWeeks) return {};
  const trend = Math.log(s.o[w] / s.o[w - p.trendWeeks]);
  if (!(trend === trend)) return {};
  const scored = [];
  for (const sym of syms) {
    const c = s.c[sym];
    const xs = [], ys = [];
    for (let k = Math.max(2, w - p.betaWeeks + 1); k <= w; k++) {
      const dO = Math.log(s.o[k] / s.o[k - 1]);
      const r = Math.log(c[k - 1] / c[k - 2]);
      if (dO === dO && r === r) { xs.push(dO); ys.push(r); }
    }
    if (xs.length < p.minWeeks) continue;
    const n = xs.length;
    const mx = xs.reduce((a, v) => a + v, 0) / n, my = ys.reduce((a, v) => a + v, 0) / n;
    let sxy = 0, sxx = 0;
    for (let k = 0; k < n; k++) { sxy += (xs[k] - mx) * (ys[k] - my); sxx += (xs[k] - mx) ** 2; }
    if (sxx > 0) scored.push([sym, sxy / sxx]);
  }
  if (scored.length < p.top) return {};
  scored.sort((a, b) => (trend > 0 ? b[1] - a[1] : a[1] - b[1]));
  const out = {};
  for (const [sym] of scored.slice(0, p.top)) out[sym] = 0.125;
  return out;
}
