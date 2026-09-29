export const meta = {
  id: "wide-dv-ctrl-sma50",
  name: "close > SMA50 (wide US stocks)",
  family: "deep-validation-control",
  source: "deep-validation.md (pre-registered dumb control for kalman/vwma leads)",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",
  params: { n: 50 },
};
export function signal(bars, i, ctx) { return bars[i].close > ctx.sma("close", ctx.params.n) ? 1 : 0; }
