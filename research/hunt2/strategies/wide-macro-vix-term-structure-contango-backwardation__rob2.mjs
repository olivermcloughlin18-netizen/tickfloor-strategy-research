// Robustness variant 2: same signal, different universe (DIA alone instead of QQQ) to test
// whether the regime filter generalizes off the original (tech-heavy) asset. No parameter change.
export const meta = {
  id: "wide-macro-vix-term-structure-contango-backwardation__rob2",
  name: "VIX term structure equity timing (DIA universe) (wide US stocks)",
  family: "macro-intermarket",
  source: "Simon & Campasano 2014 Journal of Derivatives; CBOE VIX/VIX3M",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",

  params: {},
};

export function signal(bars, i, ctx) {
  const vix = ctx.macro("VIX");
  const vix3m = ctx.macro("VIX3M");
  if (vix === null || vix3m === null) return 0;
  return vix / vix3m < 1 ? 1 : 0;
}
