// Time-series momentum vote across three crypto horizons (14/28/56 days).
// For each horizon h, vote long (1) if price is above its close h bars ago,
// or if there isn't yet h bars of history (warm-up defaults to long, same
// as buy-and-hold). Go long only when at least 2 of 3 horizons agree.
export const meta = {
  id: "r27-cx-tsmom-vote3h__rob2",
  name: "Crypto 2-of-3 horizon time-series momentum vote (+25%)",
  family: "trend",
  source: "Hurst, Ooi & Pedersen 2017 JPM (1-, 3- and 12-month blend, scaled here to crypto horizons); Liu & Tsyvinski 2021 RFS (TSMOM at 1-8 weeks)",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  params: { horizons: [18, 35, 70] },
};

export function signal(bars, i, ctx) {
  const horizons = ctx.params.horizons;
  let votes = 0;
  for (const h of horizons) {
    if (i < h || bars[i].close > bars[i - h].close) votes++;
  }
  return votes >= 2 ? 1 : 0;
}
