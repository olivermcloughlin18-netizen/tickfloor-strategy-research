// PRE-REGISTERED 2026-09-22, lane sonnet-7. Params fixed before the first run; never tuned.
// Hypothesis arm: identical to mrstop-ibs-etf-nostop plus a REALISTIC stop order.
// Realistic = triggered by the bar's LOW touching entryClose - 2*ATR14(entry), not by a close.
// The harness prices close-to-close, so the breach is detected at the close of the bar whose low
// touched the level and the position is flat from the next bar. It is an exit TIMING model, not a
// fill at the stop price: two-sided, worse than a real stop on continuation days, better on snapbacks.
export const meta = {
  id: "mrstop-ibs-etf-intrabar-stop",
  name: "IBS mean reversion, ETF universe, 2x ATR intrabar (low-touch) stop",
  family: "mean_reversion",
  source: "hunt lane sonnet-7 2026-09-22; Connors & Alvarez IBS + a real stop order, testing whether the one control-beating MR entry survives one",
  assetClass: "etf",
  timeframe: "1d",
  params: { ibsEntry: 0.2, ibsExit: 0.5, smaWindow: 5, maxHoldDays: 5, warmup: 20, atrN: 14, stopAtrMult: 2 },
};

export function signal(bars, i, ctx) {
  const { ibsEntry, ibsExit, smaWindow, maxHoldDays, warmup, atrN, stopAtrMult } = ctx.params;
  if (ctx.state.pos === undefined) { ctx.state.pos = 0; ctx.state.daysHeld = 0; ctx.state.stop = 0; ctx.state.stopped = 0; }

  const bar = bars[i];
  const range = bar.high - bar.low;
  const ibs = range > 0 ? (bar.close - bar.low) / range : 0.5;

  if (ctx.state.pos === 1) {
    ctx.state.daysHeld += 1;
    if (ctx.state.stop > 0 && bar.low <= ctx.state.stop) {
      ctx.state.pos = 0; ctx.state.daysHeld = 0; ctx.state.stopped += 1; return 0;
    }
    if (ibs > ibsExit || ctx.state.daysHeld >= maxHoldDays) { ctx.state.pos = 0; ctx.state.daysHeld = 0; return 0; }
    return 1;
  }

  if (i < warmup) return 0;
  const sma = ctx.sma("close", smaWindow, i);
  if (!Number.isFinite(sma)) return 0;
  if (ibs < ibsEntry && bar.close < sma) {
    const atr = ctx.atr(atrN, i);
    ctx.state.pos = 1;
    ctx.state.daysHeld = 0;
    ctx.state.stop = Number.isFinite(atr) && atr > 0 ? bar.close - stopAtrMult * atr : 0;
    return 1;
  }
  return 0;
}
