export const meta = {
  id: "dv-ctrl-sma20",
  name: "close > SMA20 (VWMA twin)",
  family: "deep-validation-control",
  source: "deep-validation.md (pre-registered dumb control for kalman/vwma leads)",
  assetClass: "crypto",
  timeframe: "1d",
  params: { n: 20 },
};
export function signal(bars, i, ctx) { return bars[i].close > ctx.sma("close", ctx.params.n) ? 1 : 0; }
