export const meta = {
  id: "s29-us-comomentum-gate",
  name: "Momentum switched off when comomentum is high",
  family: "momentum",
  source: "Lou & Polk 2022 RFS ('Comomentum: inferring arbitrage activity from return correlations')",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_DAILY",
  rebalance: "monthly",
  params: { top: 8, weeks: 52, pct: 0.67, minHist: 12 },
};

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const s = ctx.state;
  if (s.hist === undefined) s.hist = [];
  const nD = p.weeks * 5;
  const syms = Object.keys(universe);
  const elig = [];
  for (const sym of syms) if (universe[sym].length >= nD + 1) elig.push(sym);
  if (elig.length < p.top) return {};
  // winners
  const sc = elig.map((sym) => {
    const b = universe[sym], n = b.length;
    return [sym, b[n - 22].close / b[n - 253].close - 1];
  });
  sc.sort((a, b) => b[1] - a[1]);
  const winners = sc.slice(0, p.top).map((x) => x[0]);
  // EW index daily return keyed by time, over all stocks trading
  const sum = new Map(), cnt = new Map();
  for (const sym of syms) {
    const b = universe[sym];
    for (let k = Math.max(1, b.length - nD); k < b.length; k++) {
      const r = b[k].close / b[k - 1].close - 1;
      sum.set(b[k].time, (sum.get(b[k].time) || 0) + r);
      cnt.set(b[k].time, (cnt.get(b[k].time) || 0) + 1);
    }
  }
  const times = [...sum.keys()].sort((a, b) => a - b).slice(-nD);
  if (times.length < nD) return {};
  const m = times.map((tt) => sum.get(tt) / cnt.get(tt));
  const wk = (arr) => {
    const out = [];
    for (let w = 0; w < p.weeks; w++) {
      let c = 1;
      for (let k = w * 5; k < w * 5 + 5; k++) c *= 1 + arr[k];
      out.push(c - 1);
    }
    return out;
  };
  const mw = wk(m);
  const mm = mw.reduce((a, b) => a + b, 0) / mw.length;
  let vm = 0;
  for (const x of mw) vm += (x - mm) * (x - mm);
  const resid = winners.map((sym) => {
    const b = universe[sym];
    const byT = new Map();
    for (let k = 1; k < b.length; k++) byT.set(b[k].time, b[k].close / b[k - 1].close - 1);
    const rw = wk(times.map((tt) => byT.get(tt) ?? 0));
    const mr = rw.reduce((a, b) => a + b, 0) / rw.length;
    let cv = 0;
    for (let k = 0; k < rw.length; k++) cv += (rw[k] - mr) * (mw[k] - mm);
    const beta = vm > 0 ? cv / vm : 0;
    return rw.map((x, k) => x - mr - beta * (mw[k] - mm));
  });
  const corr = (a, b) => {
    let sa = 0, sb = 0, sab = 0;
    for (let k = 0; k < a.length; k++) { sa += a[k] * a[k]; sb += b[k] * b[k]; sab += a[k] * b[k]; }
    return sa > 0 && sb > 0 ? sab / Math.sqrt(sa * sb) : 0;
  };
  let tot = 0, np = 0;
  for (let a = 0; a < resid.length; a++) for (let b = a + 1; b < resid.length; b++) { tot += corr(resid[a], resid[b]); np++; }
  const co = tot / np;
  let high = false;
  if (s.hist.length >= p.minHist) {
    const sorted = [...s.hist].sort((a, b) => a - b);
    const pos = p.pct * (sorted.length - 1);
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    const q = sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
    high = co > q;
  }
  s.hist.push(co);
  const w = {};
  if (high) for (const sym of elig) w[sym] = 1 / elig.length;
  else for (const sym of winners) w[sym] = 1 / p.top;
  return w;
}
