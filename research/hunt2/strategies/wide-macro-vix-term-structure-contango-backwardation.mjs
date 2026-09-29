// VIX term structure regime filter: contango (VIX < VIX3M) = long equities,
// backwardation (VIX >= VIX3M) = flat. Source: Simon & Campasano 2014.
export const meta = {
  id: "wide-macro-vix-term-structure-contango-backwardation",
  name: "VIX futures term structure (contango/backwardation) equity timing (wide US stocks)",
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
