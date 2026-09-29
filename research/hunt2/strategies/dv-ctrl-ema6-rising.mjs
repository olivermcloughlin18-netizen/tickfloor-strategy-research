export const meta = {
  id: "dv-ctrl-ema6-rising",
  name: "close > rising EMA6 (Kalman twin)",
  family: "deep-validation-control",
  source: "deep-validation.md (pre-registered dumb control for kalman/vwma leads)",
  assetClass: "crypto",
  timeframe: "1d",
  params: { n: 6 },
};
export function signal(bars, i, ctx) { if (i < 1) return 0; const e = ctx.ema("close", ctx.params.n), p = ctx.ema("close", ctx.params.n, i - 1); return bars[i].close > e && e > p ? 1 : 0; }
