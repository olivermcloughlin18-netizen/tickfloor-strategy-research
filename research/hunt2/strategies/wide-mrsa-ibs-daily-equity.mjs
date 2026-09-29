export const meta = {
  id: "wide-mrsa-ibs-daily-equity",
  name: "Internal Bar Strength (IBS) daily reversion, single asset (wide US stocks)",
  family: "mean_reversion",
  source: "Connors & Alvarez 'Short Term Trading Strategies That Work'; Quantpedia IBS writeup",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",

  params: { ibsEntry: 0.2, ibsExit: 0.5, smaWindow: 5, maxHoldDays: 5 },
};

// IBS = (Close-Low)/(High-Low). Long when IBS<0.2 AND close below 5d SMA.
// Exit at close if IBS>0.5, else hold max 5 days.
export function signal(bars, i, ctx) {
  const { ibsEntry, ibsExit, smaWindow, maxHoldDays } = ctx.params;
  if (ctx.state.pos === undefined) ctx.state.pos = 0;
  if (ctx.state.daysHeld === undefined) ctx.state.daysHeld = 0;

  const bar = bars[i];
  const range = bar.high - bar.low;
  const ibs = range > 0 ? (bar.close - bar.low) / range : 0.5;

  if (ctx.state.pos === 1) {
    ctx.state.daysHeld += 1;
    if (ibs > ibsExit || ctx.state.daysHeld >= maxHoldDays) {
      ctx.state.pos = 0;
      ctx.state.daysHeld = 0;
      return 0;
    }
    return 1;
  }

  if (i + 1 < smaWindow) return 0;
  const sma = ctx.sma("close", smaWindow, i);
  if (ibs < ibsEntry && bar.close < sma) {
    ctx.state.pos = 1;
    ctx.state.daysHeld = 0;
    return 1;
  }
  return 0;
}
