export const meta = {
  id: "wide-sma200_qqq",
  name: "200-day SMA trend filter on QQQ (wide US stocks)",
  family: "trend",
  source: "Faber 2007, A Quantitative Approach to Tactical Asset Allocation",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",

  params: { window: 200 },
};

export function signal(bars, i, ctx) {
  const n = ctx.params.window;
  if (i + 1 < n) return 0;
  let sum = 0;
  for (let k = i - n + 1; k <= i; k++) sum += bars[k].close;
  return bars[i].close > sum / n ? 1 : 0;
}
