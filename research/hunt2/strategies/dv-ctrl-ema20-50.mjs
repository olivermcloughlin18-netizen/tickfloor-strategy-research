export const meta = {
  id: "dv-ctrl-ema20-50",
  name: "EMA20 > EMA50",
  family: "deep-validation-control",
  source: "deep-validation.md (pre-registered dumb control for kalman/vwma leads)",
  assetClass: "crypto",
  timeframe: "1d",
  params: { fast: 20, slow: 50 },
};
export function signal(bars, i, ctx) { return ctx.ema("close", ctx.params.fast) > ctx.ema("close", ctx.params.slow) ? 1 : 0; }
