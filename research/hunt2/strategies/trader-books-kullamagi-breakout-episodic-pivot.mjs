export const meta = {
  id: "trader-books-kullamagi-breakout-episodic-pivot",
  name: "Episodic pivot breakout (gap + consolidation + breakout)",
  family: "momentum",
  source: "Kristjan Qullamaggie 'episodic pivot' setup (public trading blog/threads). " +
    "Tested on price/volume only: the catalogue rule cites an earnings/news catalyst, " +
    "but no fundamentals/earnings-calendar data source exists in this harness, so the " +
    "catalyst is inferred purely from the gap+volume signature, not confirmed as earnings.",
  assetClass: "us_stock",
  timeframe: "1d",
  params: {
    // Loosened from the book's small/mid-cap thresholds (10% gap, 3x volume, 50% prior
    // run): the discovery universe is 40 large caps, where those never co-occur (0-1
    // trades over 8.5y). Relaxed once, before any run recorded a result, to fit this
    // universe while keeping the same gap+volume+prior-uptrend shape.
    gapPct: 0.05,          // >=5% single-day gap up
    volMultiple: 2,        // on >=2x 50-day avg volume
    volAvgDays: 50,
    priorRunDays: 63,      // ~3 trading months
    priorRunPct: 0.25,     // stock already up >=25% over trailing 3 months
    consolidationDays: 10, // ~2 weeks, tight range after the gap
    consolidationMaxRange: 0.10, // range < 10% of consolidation-period high
    holdDays: 20,
  },
};

// State machine per asset: watch for a gap day, then a consolidation window, then a
// breakout above the consolidation high. Adapted for close-to-close: the breakout fill
// is confirmed by today's high, held into tomorrow's return (no intraday exit).
export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (ctx.state.pos === undefined) ctx.state.pos = 0;
  if (ctx.state.holdLeft === undefined) ctx.state.holdLeft = 0;
  if (ctx.state.gapIdx === undefined) ctx.state.gapIdx = -1;

  // manage an open position's holding period
  if (ctx.state.pos !== 0) {
    ctx.state.holdLeft--;
    if (ctx.state.holdLeft <= 0) ctx.state.pos = 0;
    return ctx.state.pos;
  }

  if (i < Math.max(p.volAvgDays, p.priorRunDays) + 1) return 0;

  const today = bars[i];
  const prior = bars[i - 1];

  // detect a fresh episodic-pivot gap day
  const gapUp = today.open >= prior.close * (1 + p.gapPct);
  let volAvg = 0;
  for (let k = i - p.volAvgDays; k < i; k++) volAvg += bars[k].volume;
  volAvg /= p.volAvgDays;
  const volSpike = volAvg > 0 && today.volume >= p.volMultiple * volAvg;
  const priorRunRet = today.close / bars[i - p.priorRunDays].close - 1;
  const priorRun = priorRunRet >= p.priorRunPct;

  if (gapUp && volSpike && priorRun) {
    ctx.state.gapIdx = i;
    return 0;
  }

  // waiting for consolidation to complete after a recorded gap
  if (ctx.state.gapIdx >= 0) {
    const sinceGap = i - ctx.state.gapIdx;
    if (sinceGap >= p.consolidationDays) {
      const consBars = bars.slice(ctx.state.gapIdx + 1, i + 1);
      const consHigh = Math.max(...consBars.map((b) => b.high));
      const consLow = Math.min(...consBars.map((b) => b.low));
      const tight = (consHigh - consLow) / consLow <= p.consolidationMaxRange;
      if (tight && today.high >= consHigh) {
        ctx.state.pos = 1;
        ctx.state.holdLeft = p.holdDays;
        ctx.state.gapIdx = -1;
        return 1;
      }
      // consolidation window elapsed without a clean breakout: give up on this pivot
      if (sinceGap > p.consolidationDays * 2) ctx.state.gapIdx = -1;
    }
  }

  return 0;
}
