export const meta = {
  id: "mrstop-etf-boll-nostop",
  name: "Bollinger lower-band MR on ETFs, no stop (matched control)",
  family: "mean_reversion",
  source: "hunt lane terra-7 2026-09-22: stopless twin, the matched control for the ATR-stop hypothesis",
  assetClass: "etf",
  timeframe: "1d",
  params: { entryN: 20, entryK: 2, trendN: 200, maxHold: 10 },
};

export function signal(bars, i, ctx) {
  if (i < 200) return 0;

  const sma20 = ctx.sma("close", 20, i);
  const sd20 = ctx.rollingStd("close", 20, i);
  const sma200 = ctx.sma("close", 200, i);
  const c = bars[i].close;
  if (Number.isNaN(sma20) || Number.isNaN(sd20) || Number.isNaN(sma200)) return 0;

  const lowerBand = sma20 - 2 * sd20;
  if (ctx.state.pos === undefined) {
    ctx.state.pos = 0;
    ctx.state.entryClose = 0;
    ctx.state.entryAtr = 0;
    ctx.state.heldBars = 0;
  }

  if (ctx.state.pos === 0) {
    if (c < lowerBand && c > sma200) {
      ctx.state.pos = 1;
      ctx.state.entryClose = c;
      ctx.state.entryAtr = ctx.atr(14, i);
      ctx.state.heldBars = 0;
    }
    return ctx.state.pos;
  }

  ctx.state.heldBars++;
  if (c > sma20 || ctx.state.heldBars >= 10) ctx.state.pos = 0;
  return ctx.state.pos;
}
