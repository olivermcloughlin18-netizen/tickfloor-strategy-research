export const meta = {
  id: "terra6-price-sign-twin",
  name: "Terra6 Price Sign Twin",
  family: "carry",
  source: "Matched price-only twin for the Terra6 funding-sign carry hypothesis",
  assetClass: "crypto",
  timeframe: "1d",
  params: { window: 7 },
};

export function signal(bars, i, ctx) {
  const f = ctx.fundingRate();
  if (f === null) return 0;
  if (i < 7) return 0;
  const r = bars[i].close / bars[i - 7].close - 1;
  return r > 0 ? 1 : 0;
}
