export const meta = {
  id: "s29-us-distribution-days",
  name: "O'Neil distribution-day market model on the 40-stock index",
  family: "trend",
  source: "O'Neil 1988 'How to Make Money in Stocks' (distribution days and follow-through days)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_DAILY",
  rebalance: "daily",
  params: { distDrop: -0.002, window: 25, maxDist: 5, ftd: 0.0125, ftdMinDay: 4 },
};

export function rank(universe, t, ctx) {
  const p = ctx.params, st = ctx.state;
  if (st.n === undefined) { st.n = 0; st.state = "IN"; st.dist = []; st.level = 1; st.prevAV = null; st.low = 0; st.lowIdx = 0; }
  const elig = [];
  let sum = 0, cnt = 0, av = 0;
  for (const s of Object.keys(universe)) {
    const b = universe[s], L = b.length;
    if (L < 2) continue;
    elig.push(s);
    sum += b[L - 1].close / b[L - 2].close - 1; cnt++;
    av += b[L - 1].volume + b[L - 2].volume;
  }
  const w = {};
  if (!cnt) return w;
  const m = sum / cnt;
  const n = ++st.n;
  st.level *= 1 + m;
  const avUp = st.prevAV !== null && av > st.prevAV;
  st.prevAV = av;
  if (m <= p.distDrop && avUp) st.dist.push(n);
  st.dist = st.dist.filter((d) => d > n - p.window);
  if (st.state === "IN") {
    if (st.dist.length >= p.maxDist) { st.state = "OUT"; st.low = st.level; st.lowIdx = n; }
  } else {
    if (st.level < st.low) { st.low = st.level; st.lowIdx = n; }
    if (m >= p.ftd && avUp && n - st.lowIdx >= p.ftdMinDay) st.state = "IN";
  }
  if (st.state === "IN") for (const s of elig) w[s] = 1 / elig.length;
  return w;
}
