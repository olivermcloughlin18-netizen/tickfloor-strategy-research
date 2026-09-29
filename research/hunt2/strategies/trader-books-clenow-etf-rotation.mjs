// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "trader-books-clenow-etf-rotation",
  name: "Clenow dual-momentum ETF rotation",
  family: "momentum",
  source: "Antonacci/Clenow-style dual momentum rotation",
  assetClass: "etf",
  timeframe: "1d",
  universe: "ETFS_DAILY",
  rebalance: "monthly",
  params: {
    lookback12m: 252,  // 12 months in trading days
    lookback1m: 21,    // 1 month in trading days
    topN: 3,           // hold top 3 ranked ETFs
  },
};

export function rank(universe, t, ctx) {
  const bars12m = ctx.params.lookback12m;
  const bars1m = ctx.params.lookback1m;
  const topN = ctx.params.topN;

  const scores = [];

  for (const sym of Object.keys(universe)) {
    const b = universe[sym];

    // Skip if not enough history for 12-month lookback
    if (b.length < bars12m + 1) continue;

    // Get prices at different points from the end of the array
    const priceNow = b[b.length - 1].close;
    const price12mAgo = b[b.length - 1 - bars12m].close;
    const price1mAgo = b[b.length - 1 - bars1m].close;

    if (priceNow <= 0 || price12mAgo <= 0 || price1mAgo <= 0) continue;

    // Calculate momentum scores: 12-month return minus 1-month return
    const ret12m = (priceNow / price12mAgo) - 1;
    const ret1m = (priceNow / price1mAgo) - 1;
    const score = ret12m - ret1m;

    scores.push({ sym, score, ret12m });
  }

  // Sort by dual-momentum score descending
  scores.sort((a, b) => b.score - a.score);

  // Get the benchmark (SHY - short-term T-bill proxy for cash)
  const shy = universe["SHY"];
  if (!shy || shy.length < bars12m + 1) {
    // Can't compute cash proxy; hold nothing
    return {};
  }

  const shyPriceNow = shy[shy.length - 1].close;
  const shyPrice12mAgo = shy[shy.length - 1 - bars12m].close;

  if (shyPriceNow <= 0 || shyPrice12mAgo <= 0) return {};

  const shyRet12m = (shyPriceNow / shyPrice12mAgo) - 1;

  // Hold top N ETFs that beat cash (SHY) over 12 months - equal-weight those that pass
  const topCandidates = scores.slice(0, topN);
  const passingEtfs = topCandidates.filter(s => s.ret12m > shyRet12m);

  const weights = {};
  if (passingEtfs.length > 0) {
    const eqWeight = 1 / passingEtfs.length;
    for (const etf of passingEtfs) {
      weights[etf.sym] = eqWeight;
    }
  }

  return weights;
}
