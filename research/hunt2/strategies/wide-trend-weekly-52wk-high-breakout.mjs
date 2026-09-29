// 52-week high breakout with 20-week trailing-low stop, on QQQ (catalogue basket was
// SPY/QQQ/GLD; SPY is holdout with no listed proxy substitution for this multi-asset
// basket rule, so tested single-asset on QQQ, one of the named basket members).
export const meta = {
  id: "wide-trend-weekly-52wk-high-breakout",
  name: "52-week high breakout, 20-week trailing stop (QQQ) (wide US stocks)",
  family: "trend",
  source: "Darvas box / O'Neil CANSLIM breakout tradition; cf. edge R4 #4",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",

  params: { entryWeeks: 52, exitWeeks: 20 },
};

// Weekly bars via ctx.resample; only look at completed weeks to avoid lookahead.
export function signal(bars, i, ctx) {
  const weekly = ctx.resample(bars, "1w");
  const complete = weekly.filter((w) => w.complete);
  const { entryWeeks, exitWeeks } = ctx.params;
  if (complete.length < entryWeeks + 1) return 0;

  const last = complete[complete.length - 1];
  const priorEntry = complete.slice(-1 - entryWeeks, -1);
  const priorExit = complete.slice(-1 - exitWeeks, -1);
  const high52 = Math.max(...priorEntry.map((w) => w.high));
  const low20 = Math.min(...priorExit.map((w) => w.low));

  if (ctx.state.pos === undefined) ctx.state.pos = 0;
  if (last.close > high52) ctx.state.pos = 1;
  else if (last.close < low20) ctx.state.pos = 0;
  return ctx.state.pos;
}
