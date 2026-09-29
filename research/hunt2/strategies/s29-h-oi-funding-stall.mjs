export const meta = {
  id: "s29-h-oi-funding-stall",
  name: "Short leveraged longs piling into a stalled price",
  family: "mean_reversion",
  source: "Schmeling, Schrimpf & Todorov 2023 (high funding = crowded longs, crash risk); He, Manela, Ross & von Wachter 2022",
  assetClass: "crypto",
  timeframe: "1h",
  longShort: true,
  holdBars: 12,
  params: { window: 24, oiRise: 0.08, fundMin: 0.0002, holdBars: 12 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (i < p.window) return 0;
  const oi = ctx.openInterest(i), oi0 = ctx.openInterest(i - p.window), F = ctx.fundingRate(i);
  if (!oi || !oi0 || F === null || F === undefined) return 0;
  if (oi / oi0 - 1 >= p.oiRise && F >= p.fundMin && bars[i].close / bars[i - p.window].close - 1 <= 0) return -1;
  return 0;
}
