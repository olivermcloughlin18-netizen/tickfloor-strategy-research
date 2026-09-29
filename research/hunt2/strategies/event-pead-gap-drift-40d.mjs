export const meta = {
  id: "event-pead-gap-drift-40d",
  name: "PEAD drift window: volume-confirmed earnings-gap, 40-day hold",
  family: "event-driven",
  source: "Bernard & Thomas (1989) JAR; Chan, Jegadeesh & Lakonishok (1996) JF",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",
  rebalance: "daily",
  params: { gapThreshold: 0.04, volMultiplier: 2.0, volLookback: 20, holdDays: 40 },
};

export function rank(universe, t, ctx) {
  const { gapThreshold, volMultiplier, volLookback, holdDays } = ctx.params;
  const book = [];

  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];
    if (bars.length < volLookback + 2) continue;

    let first = bars.length - holdDays;
    if (first < volLookback) first = volLookback;
    for (let k = first; k < bars.length; k++) {
      let volumeSum = 0;
      for (let j = k - volLookback; j < k; j++) volumeSum += bars[j].volume;
      const gap = bars[k].open / bars[k - 1].close - 1;
      if (gap >= gapThreshold && bars[k].volume >= volMultiplier * (volumeSum / volLookback)) {
        book.push(sym);
        break;
      }
    }
  }

  const weights = {};
  for (const sym of book) weights[sym] = 1 / book.length;
  return weights;
}
