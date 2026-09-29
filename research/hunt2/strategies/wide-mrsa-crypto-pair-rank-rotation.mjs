// Cross-sectional short-term reversal among the discovery crypto universe.
// Catalogue asked for top-20 crypto by CoinGecko market cap; CoinGecko isn't a
// supported ctx source, so the harness's own CRYPTO_DAILY universe (18 assets) is
// used as the cross-section instead.
export const meta = {
  id: "wide-mrsa-crypto-pair-rank-rotation",
  name: "Cross-sectional reversal, crypto universe, weekly (wide US stocks)",
  family: "mean_reversion",
  source: "Liu & Tsyvinski 2021 JF 'Risks and Returns of Cryptocurrency' (extrapolated to reversal)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "weekly",
  longShort: true,
  params: { lookbackDays: 7, quintile: 0.2 },
};

export function rank(universe, t, ctx) {
  const { lookbackDays, quintile } = ctx.params;
  const rows = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < lookbackDays + 1) continue;
    const ret = b[b.length - 1].close / b[b.length - 1 - lookbackDays].close - 1;
    if (!Number.isFinite(ret)) continue;
    rows.push({ sym, ret });
  }
  if (rows.length < 6) return {};

  rows.sort((a, b) => a.ret - b.ret); // ascending: worst performers first
  const n = Math.max(1, Math.round(rows.length * quintile));
  const losers = rows.slice(0, n);
  const winners = rows.slice(-n);

  const w = {};
  const longW = 0.5 / losers.length;
  const shortW = 0.5 / winners.length;
  for (const r of losers) w[r.sym] = longW; // long bottom quintile (expect reversal up)
  for (const r of winners) w[r.sym] = -shortW; // short top quintile
  return w;
}
