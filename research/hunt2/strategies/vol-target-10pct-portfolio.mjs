// 10% annualized volatility targeting overlay on a long-only BTC position.
// Source: Moreira & Muir 2017 JF 'Volatility-Managed Portfolios'.
// NOTE: sizing overlays need fractional weight, so this runs in rank() (portfolio) mode
// rather than signal() mode, which only returns discrete 1/0/-1.
export const meta = {
  id: "vol-target-10pct-portfolio",
  name: "10% annualized volatility targeting overlay",
  family: "volatility",
  source: "Moreira & Muir 2017 JF; EDGE RESEARCH.md §12 (SMA-trend variant already failed there)",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "daily",
  params: { targetVolAnnual: 0.10, volWindow: 30 },
};

const SYM = "BTCUSDT";

export function rank(universe, t, ctx) {
  const bars = universe[SYM];
  if (!bars || bars.length < ctx.params.volWindow + 1) return {};

  const n = ctx.params.volWindow;
  const end = bars.length - 1;
  let sumSq = 0;
  for (let k = end - n + 1; k < end; k++) {
    const r = bars[k + 1].close / bars[k].close - 1;
    sumSq += r * r;
  }
  const dailyVol = Math.sqrt(sumSq / (n - 1));
  const annualVol = dailyVol * Math.sqrt(365);
  if (!(annualVol > 0)) return {};

  const w = Math.min(1, ctx.params.targetVolAnnual / annualVol);
  return { [SYM]: w };
}
