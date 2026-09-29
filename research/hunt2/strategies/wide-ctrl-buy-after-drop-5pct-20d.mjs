// DUMB CONTROL. Not a strategy: the bar every gate has to clear. Buy any stock the
// day after it falls 5%, hold 20 bars, same universe, same costs as everything else.
export const meta = {
  id: "wide-ctrl-buy-after-drop-5pct-20d",
  name: "Control: buy after a 5% down day, hold 20d (wide US stocks)",
  family: "other",
  source: "dumb control - buy-after-a-drop, matched frequency, same costs",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",
  holdBars: 20,
  params: { dropPct: 5, hold: 20 },
};

export function signal(bars, i, ctx) {
  if (i < 1) return 0;
  return bars[i].close / bars[i - 1].close - 1 <= -ctx.params.dropPct / 100 ? 1 : 0;
}
