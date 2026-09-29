// ATR-normalized Donchian breakout, 1h crypto bars.
// Source: classic Turtle/Donchian breakout system (CTA/managed-futures lineage).
export const meta = {
  id: "vol-atr-breakout-15m-1h",
  name: "ATR-normalized breakout, 1h bars",
  family: "volatility",
  source: "EDGE RESEARCH.md §21/§23/§42 (ATR_MULT=1.5, RR=3, 1h) — retested here in hunt2's harness",
  assetClass: "crypto",
  timeframe: "1h",
  params: { donchianWindow: 20, atrWindow: 14, atrLookback: 20, stopMult: 1.5, targetMult: 3 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (ctx.state.pos === undefined) ctx.state.pos = 0;
  if (ctx.state.stop === undefined) ctx.state.stop = 0;
  if (ctx.state.target === undefined) ctx.state.target = 0;

  const minBars = Math.max(p.donchianWindow, p.atrWindow + p.atrLookback) + 1;
  if (i + 1 < minBars) return 0;

  const close = bars[i].close;

  if (ctx.state.pos === 1) {
    if (close <= ctx.state.stop || close >= ctx.state.target) {
      ctx.state.pos = 0;
      return 0;
    }
    return 1;
  }

  const atrNow = ctx.atr(p.atrWindow, i);
  const atrPast = ctx.atr(p.atrWindow, i - p.atrLookback);
  const priorHigh = ctx.donchian(p.donchianWindow, i - 1).upper;

  if (isNaN(atrNow) || isNaN(atrPast)) return 0;

  if (close > priorHigh && atrNow > atrPast) {
    ctx.state.pos = 1;
    ctx.state.stop = close - p.stopMult * atrNow;
    ctx.state.target = close + p.targetMult * atrNow;
    return 1;
  }
  return 0;
}
