export const meta = {
  id: "wide-equity-factors-vol-breakout-larry-williams",
  name: "Larry Williams %-range volatility breakout (0.7x) (wide US stocks)",
  family: "volatility",
  source: "Larry Williams, 'Long-Term Secrets to Short-Term Trading' (1999). " +
    "Same rule as trader-books-larry-williams-volatility-breakout; separate catalogue entry, " +
    "run independently at the same fixed params. Adapted for close-to-close: breakout " +
    "confirmed by today's high is held into tomorrow's close-to-close return instead of " +
    "closed out same day (the harness has no intraday exit).",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",
  params: {
    k: 0.7,
  },
};

export function signal(bars, i, ctx) {
  if (i < 1) return 0;
  const prev = bars[i - 1];
  const today = bars[i];
  const range = prev.high - prev.low;
  const entry = today.open + ctx.params.k * range;
  return today.high >= entry ? 1 : 0;
}
