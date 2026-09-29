export const meta = {
  id: "dv-vwma-weekly",
  name: "VWMA20 cross, weekly rebalance",
  family: "deep-validation-execution",
  source: "deep-validation.md (pre-registered execution check of social-ta-vwma-cross)",
  assetClass: "crypto",
  timeframe: "1d",
  params: { vwmaLength: 20 },
};
function vwma(bars, i, ctx) {
  const n = ctx.params.vwmaLength;
  if (i + 1 < n) return 0;
  let pv = 0, v = 0;
  for (let k = i - n + 1; k <= i; k++) { pv += bars[k].close * bars[k].volume; v += bars[k].volume; }
  return bars[i].close > (v > 0 ? pv / v : 0) ? 1 : 0;
}
export function signal(bars, i, ctx) { const raw = vwma(bars, i, ctx); if (ctx.state.pos === undefined) ctx.state.pos = 0; if ((Math.floor(bars[i].time / 86400) + 3) % 7 === 6) ctx.state.pos = raw; return ctx.state.pos; }
