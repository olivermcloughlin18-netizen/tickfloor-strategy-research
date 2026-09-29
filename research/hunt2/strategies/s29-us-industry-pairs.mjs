export const meta = {
  "id": "s29-us-industry-pairs",
  "name": "Fixed same-industry pairs, 60-day z-score reversion",
  "family": "mean_reversion",
  "source": "Gatev, Goetzmann & Rouwenhorst 2006 RFS (pairs trading); Do & Faff 2010 FAJ (same-industry pairs work best)",
  "assetClass": "us_stock",
  "timeframe": "1d",
  "assets": [
    "AAPL",
    "NVDA",
    "AMZN",
    "GOOGL",
    "META",
    "TSLA",
    "JPM",
    "V",
    "UNH",
    "XOM",
    "JNJ",
    "COST",
    "ABBV",
    "MRK",
    "AVGO",
    "CVX",
    "WMT",
    "BAC",
    "ORCL",
    "ADBE",
    "CRM",
    "NFLX",
    "AMD",
    "INTC",
    "ABT",
    "MCD",
    "DIS",
    "QCOM",
    "TXN",
    "HON",
    "CAT",
    "LOW",
    "SBUX",
    "BA",
    "UPS",
    "PFE",
    "T",
    "MDT",
    "UNP",
    "MMM"
  ],
  "longShort": true,
  "rebalance": "daily",
  "params": {
    "window": 60,
    "entryZ": 2,
    "exitZ": 0.5,
    "maxHold": 20,
    "legWeight": 0.0625
  }
};

const PAIRS = [["XOM", "CVX"], ["JPM", "BAC"], ["MRK", "PFE"], ["WMT", "COST"], ["QCOM", "TXN"], ["MCD", "SBUX"], ["ABT", "MDT"], ["GOOGL", "META"]];
export function rank(universe, t, ctx) {
  const { window, entryZ, exitZ, maxHold, legWeight } = ctx.params;
  const st = ctx.state;
  if (st.pos === undefined) st.pos = {};
  const w = {};
  for (const [A, B] of PAIRS) {
    const key = A + "/" + B;
    const a = universe[A], b = universe[B];
    const p = st.pos[key];
    if (!a || !b || a.length < window || b.length < window || a.length !== b.length) { delete st.pos[key]; continue; }
    const na = a.length;
    let m = 0;
    const s = [];
    for (let k = na - window; k < na; k++) { const x = Math.log(a[k].close / b[k].close); s.push(x); m += x; }
    m /= window;
    let ss = 0;
    for (const x of s) ss += (x - m) * (x - m);
    const sd = Math.sqrt(ss / (window - 1));
    if (!(sd > 0)) { delete st.pos[key]; continue; }
    const z = (s[window - 1] - m) / sd;
    if (p) {
      p.n++;
      if (Math.abs(z) <= exitZ || p.n >= maxHold) { delete st.pos[key]; continue; }
    } else if (z >= entryZ) st.pos[key] = { dir: -1, n: 0 };
    else if (z <= -entryZ) st.pos[key] = { dir: 1, n: 0 };
    const q = st.pos[key];
    if (q) { w[A] = q.dir * legWeight; w[B] = -q.dir * legWeight; }
  }
  return w;
}
