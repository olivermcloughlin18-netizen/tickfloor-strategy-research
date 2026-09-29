// Donchian breakout gated by ATR being in its top 30th percentile of the trailing 90-day
// distribution (genuine vol expansion, not noise). 1h crypto bars.
export const meta = {
  id: "vol-atr-percentile-breakout-filter",
  name: "ATR percentile filter on breakout entries",
  family: "volatility",
  source: "builds on EDGE RESEARCH.md §21/§23/§42 ATR breakout base rule, adding a percentile gate",
  assetClass: "crypto",
  timeframe: "1h",
  params: { donchianWindow: 20, atrWindow: 14, percentileWindow: 2160, percentileCut: 0.7, stopMult: 1.5, targetMult: 3 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (ctx.state.pos === undefined) ctx.state.pos = 0;
  if (ctx.state.stop === undefined) ctx.state.stop = 0;
  if (ctx.state.target === undefined) ctx.state.target = 0;

  const minBars = Math.max(p.donchianWindow, p.atrWindow + p.percentileWindow) + 1;
  if (i + 1 < minBars) return 0;

  const close = bars[i].close;

  if (ctx.state.pos === 1) {
    if (close <= ctx.state.stop || close >= ctx.state.target) {
      ctx.state.pos = 0;
      return 0;
    }
    return 1;
  }

  const priorHigh = ctx.donchian(p.donchianWindow, i - 1).upper;
  if (close <= priorHigh) return 0;

  const atrNow = ctx.atr(p.atrWindow, i);
  if (isNaN(atrNow)) return 0;

  let below = 0;
  let total = 0;
  for (let k = i - p.percentileWindow + 1; k <= i; k++) {
    const a = ctx.atr(p.atrWindow, k);
    if (isNaN(a)) continue;
    total++;
    if (a <= atrNow) below++;
  }
  if (total === 0) return 0;
  const pct = below / total;

  if (pct >= p.percentileCut) {
    ctx.state.pos = 1;
    ctx.state.stop = close - p.stopMult * atrNow;
    ctx.state.target = close + p.targetMult * atrNow;
    return 1;
  }
  return 0;
}
