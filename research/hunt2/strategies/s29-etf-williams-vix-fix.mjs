export const meta = {
  id: "s29-etf-williams-vix-fix",
  name: "Williams VIX Fix spike on equity ETFs",
  family: "mean_reversion",
  source: "Larry Williams 2007 Active Trader ('The VIX Fix')",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ","DIA","XLK","XLF","XLE","XLV","XLI","XLP","XLY","XLU","XLB","VNQ"],
  params: { lookback: 22, band: 20, k: 2, holdBars: 5 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (ctx.state.left === undefined) { ctx.state.left = 0; ctx.state.w = ctx.rolling(p.band); }
  let cur = NaN;
  if (i + 1 >= p.lookback) {
    let hi = -Infinity;
    for (let k = i - p.lookback + 1; k <= i; k++) if (bars[k].close > hi) hi = bars[k].close;
    cur = 100 * (hi - bars[i].low) / hi;
    ctx.state.w.push(cur);
  }
  if (ctx.state.left > 0) { ctx.state.left--; return 1; }
  if (i < 42 || !ctx.state.w.full()) return 0;
  const upper = ctx.state.w.mean() + p.k * ctx.state.w.std();
  if (cur >= upper) { ctx.state.left = p.holdBars - 1; return 1; }
  return 0;
}
