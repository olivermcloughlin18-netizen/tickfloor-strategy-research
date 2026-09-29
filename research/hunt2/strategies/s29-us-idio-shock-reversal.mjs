export const meta = {
  id: "s29-us-idio-shock-reversal",
  name: "Three-sigma idiosyncratic down-shock rebound",
  family: "mean_reversion",
  source: "Savor 2012 JFE ('Stock returns after major price shocks: the impact of information'); Chan 2003 JFE (no-news reversals)",
  assetClass: "us_stock",
  timeframe: "1d",
  assets: ["AAPL", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "JPM", "V", "UNH", "XOM", "JNJ", "COST", "ABBV", "MRK", "AVGO", "CVX", "WMT", "BAC", "ORCL", "ADBE", "CRM", "NFLX", "AMD", "INTC", "ABT", "MCD", "DIS", "QCOM", "TXN", "HON", "CAT", "LOW", "SBUX", "BA", "UPS", "PFE", "T", "MDT", "UNP", "MMM"],
  rebalance: "daily",
  params: { window: 60, k: 3, holdDays: 5 },
};

export function rank(universe, t, ctx) {
  const p = ctx.params;
  if (ctx.state.cnt === undefined) ctx.state.cnt = {};
  const cnt = ctx.state.cnt;
  for (const s of Object.keys(cnt)) if (cnt[s] > 0) cnt[s]--;
  const need = p.window + 2; // closes for window+1 returns
  const syms = Object.keys(universe).filter((s) => universe[s].length >= need);
  // EW index return per day over the last window+1 days
  const sum = new Map(), n = new Map();
  const rets = {};
  for (const s of syms) {
    const b = universe[s];
    const r = [];
    for (let k = b.length - p.window - 1; k < b.length; k++) {
      const x = b[k].close / b[k - 1].close - 1;
      r.push([b[k].time, x]);
      sum.set(b[k].time, (sum.get(b[k].time) || 0) + x);
      n.set(b[k].time, (n.get(b[k].time) || 0) + 1);
    }
    rets[s] = r;
  }
  for (const s of syms) {
    const r = rets[s];
    const e = r.map(([tm, x]) => x - sum.get(tm) / n.get(tm));
    const prev = e.slice(0, -1);
    let mu = 0;
    for (const v of prev) mu += v;
    mu /= prev.length;
    let ss = 0;
    for (const v of prev) ss += (v - mu) * (v - mu);
    const sd = Math.sqrt(ss / (prev.length - 1));
    if (sd > 0 && e[e.length - 1] <= -p.k * sd) cnt[s] = p.holdDays;
  }
  const held = Object.keys(cnt).filter((s) => cnt[s] > 0 && universe[s]);
  const w = {};
  for (const s of held) w[s] = 1 / held.length;
  return w;
}
