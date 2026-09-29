// PRE-REGISTERED 2026-09-22, lane sonnet-7. Params fixed before the first run; never tuned.
// Control arm: the canonical IBS mean-reversion rule on the full discovery ETF universe, NO stop.
// Its twin mrstop-ibs-etf-intrabar-stop is byte-identical except for the stop block.
export const meta = {
  id: "mrstop-ibs-etf-nostop",
  name: "IBS mean reversion, ETF universe, no stop (matched control arm)",
  family: "mean_reversion",
  source: "hunt lane sonnet-7 2026-09-22; Connors & Alvarez IBS, catalogue rule mrsa-ibs-daily-equity, widened to the ETF universe as the stopless control",
  assetClass: "etf",
  timeframe: "1d",
  params: { ibsEntry: 0.2, ibsExit: 0.5, smaWindow: 5, maxHoldDays: 5, warmup: 20 },
};

export function signal(bars, i, ctx) {
  const { ibsEntry, ibsExit, smaWindow, maxHoldDays, warmup } = ctx.params;
  if (ctx.state.pos === undefined) { ctx.state.pos = 0; ctx.state.daysHeld = 0; }

  const bar = bars[i];
  const range = bar.high - bar.low;
  const ibs = range > 0 ? (bar.close - bar.low) / range : 0.5;

  if (ctx.state.pos === 1) {
    ctx.state.daysHeld += 1;
    if (ibs > ibsExit || ctx.state.daysHeld >= maxHoldDays) { ctx.state.pos = 0; ctx.state.daysHeld = 0; return 0; }
    return 1;
  }

  if (i < warmup) return 0;
  const sma = ctx.sma("close", smaWindow, i);
  if (!Number.isFinite(sma)) return 0;
  if (ibs < ibsEntry && bar.close < sma) { ctx.state.pos = 1; ctx.state.daysHeld = 0; return 1; }
  return 0;
}
