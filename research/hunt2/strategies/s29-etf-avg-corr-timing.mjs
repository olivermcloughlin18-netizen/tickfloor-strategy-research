export const meta = {
  "id": "s29-etf-avg-corr-timing",
  "name": "Average sector correlation predicts market returns",
  "family": "other",
  "source": "Pollet & Wilson 2010 JFE ('Average correlation and stock market returns')",
  "assetClass": "etf",
  "timeframe": "1d",
  "assets": [
    "XLK",
    "XLF",
    "XLE",
    "XLV",
    "XLI",
    "XLP",
    "XLY",
    "XLU",
    "XLB",
    "QQQ",
    "DIA",
    "IEF"
  ],
  "rebalance": "monthly",
  "params": {
    "window": 63,
    "minHist": 12
  }
};

const SECT = ["XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB"];
export function rank(universe, t, ctx) {
  const { window, minHist } = ctx.params;
  const st = ctx.state;
  if (st.ac === undefined) st.ac = [];
  const R = [];
  for (const s of SECT) {
    const b = universe[s];
    if (!b || b.length < window + 1) return {};
    const n = b.length, r = [];
    for (let k = n - window; k < n; k++) r.push(b[k].close / b[k - 1].close - 1);
    R.push(r);
  }
  let sum = 0, cnt = 0;
  for (let a = 0; a < R.length; a++) for (let c = a + 1; c < R.length; c++) {
    let ma = 0, mc = 0;
    for (let k = 0; k < window; k++) { ma += R[a][k]; mc += R[c][k]; }
    ma /= window; mc /= window;
    let sab = 0, saa = 0, scc = 0;
    for (let k = 0; k < window; k++) { const x = R[a][k] - ma, y = R[c][k] - mc; sab += x * y; saa += x * x; scc += y * y; }
    sum += sab / Math.sqrt(saa * scc); cnt++;
  }
  const ac = sum / cnt;
  let hi = st.ac.length < minHist;
  if (!hi) {
    const s = st.ac.slice().sort((x, y) => x - y), n = s.length;
    const med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
    hi = ac > med;
  }
  st.ac.push(ac);
  return hi ? { QQQ: 0.5, DIA: 0.5 } : { QQQ: 0.25, DIA: 0.25, IEF: 0.5 };
}
