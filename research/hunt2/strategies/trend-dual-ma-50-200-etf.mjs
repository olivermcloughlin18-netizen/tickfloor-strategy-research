// Golden/death cross (50 SMA vs 200 SMA), long/cash only. SPY is holdout -> proxy QQQ.
export const meta = {
  id: "trend-dual-ma-50-200-etf",
  name: "Dual moving average crossover (50/200 SMA) on SPY",
  family: "trend",
  source: "Faber 2007 SSRN 962461",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ"],
  proxyFor: { SPY: "QQQ" },
  params: { fastWindow: 50, slowWindow: 200 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (i + 1 < p.slowWindow) return 0;
  const fast = ctx.sma("close", p.fastWindow, i);
  const slow = ctx.sma("close", p.slowWindow, i);
  return fast > slow ? 1 : 0;
}
