export const meta = {
  id: "wide-dv-ctrl-mom20",
  name: "20-day momentum sign (wide US stocks)",
  family: "deep-validation-control",
  source: "deep-validation.md (pre-registered dumb control for kalman/vwma leads)",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",
  params: { n: 20 },
};
export function signal(bars, i, ctx) { return i >= ctx.params.n && bars[i].close > bars[i - ctx.params.n].close ? 1 : 0; }
