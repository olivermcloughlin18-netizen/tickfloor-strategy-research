export const meta = {
  id: "trader-books-inside-bar-breakout",
  name: "Inside bar breakout",
  family: "trend",
  source: "classic price-action inside-bar breakout pattern",
  assetClass: "crypto",
  timeframe: "1d",
  longShort: true,
  params: {},
};

// If bars[i-1] was an inside bar (high<bars[i-2].high, low>bars[i-2].low), place a stop
// order for today (bar i) above the inside bar's high (long) / below its low (short).
// Adapted for close-to-close: a fill confirmed by today's high/low is held into
// tomorrow's close-to-close return (no intraday exit available).
export function signal(bars, i, ctx) {
  if (i < 2) return 0;
  const inside = bars[i - 1];
  const mother = bars[i - 2];
  const isInsideBar = inside.high < mother.high && inside.low > mother.low;
  if (!isInsideBar) return 0;
  const today = bars[i];
  if (today.high >= inside.high) return 1;
  if (today.low <= inside.low) return -1;
  return 0;
}
