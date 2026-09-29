export const meta = {
  id: "wide-trader-books-larry-williams-volatility-breakout",
  name: "Larry Williams volatility breakout (day-trade) (wide US stocks)",
  family: "volatility",
  source: "Larry Williams, 'Long-Term Secrets to Short-Term Trading' (1999). " +
    "Adapted for the harness's close-to-close position model: the book's same-day " +
    "open-to-close day-trade is not representable without intraday data, so a breakout " +
    "confirmed by today's high is held into tomorrow's close-to-close return instead of " +
    "closed out same day.",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",
  params: {
    k: 0.7,
  },
};

// Entry level = today's open + k * (yesterday's high - yesterday's low).
// If today's high reaches that level, treat it as filled intraday and hold to today's close
// (day-trade: flat by the next bar's open). No history bar to look back from at i=0.
export function signal(bars, i, ctx) {
  if (i < 1) return 0;
  const prev = bars[i - 1];
  const today = bars[i];
  const range = prev.high - prev.low;
  const entry = today.open + ctx.params.k * range;
  return today.high >= entry ? 1 : 0;
}
