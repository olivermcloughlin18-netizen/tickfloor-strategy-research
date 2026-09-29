export const meta = {
  id: "dv-ctrl-mom20",
  name: "20-day momentum sign",
  family: "deep-validation-control",
  source: "deep-validation.md (pre-registered dumb control for kalman/vwma leads)",
  assetClass: "crypto",
  timeframe: "1d",
  params: { n: 20 },
};
export function signal(bars, i, ctx) { return i >= ctx.params.n && bars[i].close > bars[i - ctx.params.n].close ? 1 : 0; }
