export const meta = {
  id: "ctrl-bigmove-drift-40d",
  name: "Control: same 40-day drift book, gap only, NO volume confirmation",
  family: "event-driven",
  source: "matched naive control for event-pead-gap-drift-40d",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",
  rebalance: "daily",
  params: { gapThreshold: 0.04, holdDays: 40 },
};

export function rank(universe, t, ctx) {
  const { gapThreshold, holdDays } = ctx.params;
  const book = [];

  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];
    if (bars.length < 22) continue;

    let first = bars.length - holdDays;
    if (first < 20) first = 20;
    for (let k = first; k < bars.length; k++) {
      const gap = bars[k].open / bars[k - 1].close - 1;
      if (gap >= gapThreshold) {
        book.push(sym);
        break;
      }
    }
  }

  const weights = {};
  for (const sym of book) weights[sym] = 1 / book.length;
  return weights;
}
