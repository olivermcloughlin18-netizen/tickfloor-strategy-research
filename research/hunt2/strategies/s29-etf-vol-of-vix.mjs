export const meta = {
  "id": "s29-etf-vol-of-vix",
  "name": "Stand aside when VIX is low but jittery (vol-of-vol spike)",
  "family": "volatility",
  "source": "Park 2015 JFQA ('Volatility of volatility and tail risk premiums'); Huang, Schlag, Shaliastovich & Thimme 2019 RFS (volatility-of-volatility risk)",
  "assetClass": "etf",
  "timeframe": "1d",
  "assets": [
    "QQQ",
    "DIA",
    "XLK",
    "XLY"
  ],
  "params": {
    "window": 21,
    "pct": 0.8,
    "base": 252,
    "vixMax": 20,
    "flatBars": 21
  }
};

// ponytail: trigger bar counts as first of the flatBars flat bars.
export function signal(bars, i, ctx) {
  const { window, pct, base, vixMax, flatBars } = ctx.params;
  const st = ctx.state;
  if (st.lr === undefined) { st.lr = []; st.vv = []; st.flat = 0; }
  const v = ctx.macro("VIX", i), vp = i > 0 ? ctx.macro("VIX", i - 1) : null;
  if (v === null || vp === null || !(v > 0) || !(vp > 0)) return 0;
  st.lr.push(Math.log(v / vp));
  if (st.lr.length > window) st.lr.shift();
  if (st.lr.length < window) return 0;
  let mu = 0;
  for (const x of st.lr) mu += x;
  mu /= window;
  let ss = 0;
  for (const x of st.lr) ss += (x - mu) * (x - mu);
  const vv = Math.sqrt(ss / (window - 1));
  const prev = st.vv.slice(-base);
  st.vv.push(vv);
  if (prev.length < base) return 0;
  const sorted = prev.slice().sort((x, y) => x - y);
  const pos = pct * (base - 1), lo = Math.floor(pos);
  const q = sorted[lo] + (sorted[Math.min(lo + 1, base - 1)] - sorted[lo]) * (pos - lo);
  if (vv >= q && v < vixMax) { st.flat = flatBars - 1; return 0; }
  if (st.flat > 0) { st.flat--; return 0; }
  return 1;
}
