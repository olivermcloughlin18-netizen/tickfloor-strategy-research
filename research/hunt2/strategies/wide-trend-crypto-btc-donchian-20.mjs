export const meta = {
  id: "wide-trend-crypto-btc-donchian-20",
  name: "Donchian 20-day breakout on BTC (crypto trend variant) (wide US stocks)",
  family: "trend",
  source: "Turtle Trader Donchian methodology adapted to crypto; cf. edge §12, §42",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",

  params: { entryWindow: 20, exitWindow: 10 },
};

export function signal(bars, i, ctx) {
  const { entryWindow, exitWindow } = ctx.params;
  if (i < 1) return 0;
  const entry = ctx.donchian(entryWindow, i - 1);
  const exit = ctx.donchian(exitWindow, i - 1);
  if (Number.isNaN(entry.upper) || Number.isNaN(exit.lower)) return 0;

  if (ctx.state.pos === undefined) ctx.state.pos = 0;

  if (bars[i].close > entry.upper) ctx.state.pos = 1;
  else if (bars[i].close < exit.lower) ctx.state.pos = 0;

  return ctx.state.pos;
}
