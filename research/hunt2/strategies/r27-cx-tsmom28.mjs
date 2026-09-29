// prereg r27-cx-tsmom28 (C1, RISK_IMPROVER track): 28-day time-series momentum,
// long-only, on the full crypto daily universe. Long when today's close beats
// the close 28 bars ago, else flat. Warm-up (i < 28) holds long, same as buy-and-hold.
export const meta = {
  id: "r27-cx-tsmom28",
  name: "Crypto 4-week time-series momentum filter",
  family: "trend",
  source: "Liu & Tsyvinski 2021 RFS 'Risks and Returns of Cryptocurrency' (time-series momentum at 1-4 week horizons); Moskowitz, Ooi & Pedersen 2012 JFE",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  params: { lookback: 28 },
};

export function signal(bars, i, ctx) {
  const n = ctx.params.lookback;
  if (i < n) return 1;
  return bars[i].close > bars[i - n].close ? 1 : 0;
}
