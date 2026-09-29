export const meta = {
  id: "mrsa-btc-eth-ratio-reversion",
  name: "BTC/ETH ratio mean reversion",
  family: "mean-reversion-statarb",
  source: "crypto trading forum/blog consensus (e.g. Kraken/FTX-era stat-arb writeups)",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "daily",
  longShort: true,
  params: { window: 60, zThreshold: 2 },
};

export function rank(universe, t, ctx) {
  const btc = universe.BTCUSDT;
  const eth = universe.ETHUSDT;

  if (!btc || !eth || btc.length < ctx.params.window || eth.length < ctx.params.window) {
    return {};
  }

  // Compute 60-day rolling mean and std of BTC/ETH ratio
  const n = ctx.params.window;
  const lastIdx = btc.length - 1;

  let sum = 0;
  let sumSq = 0;
  for (let k = lastIdx - n + 1; k <= lastIdx; k++) {
    const ratio = btc[k].close / eth[k].close;
    sum += ratio;
    sumSq += ratio * ratio;
  }

  const mean = sum / n;
  const variance = (sumSq / n) - (mean * mean);
  const std = Math.sqrt(variance);

  // Compute z-score for current ratio
  const ratio = btc[lastIdx].close / eth[lastIdx].close;
  const z = std > 0 ? (ratio - mean) / std : 0;

  // Position logic: z > 2 short BTC/long ETH, z < -2 long BTC/short ETH, else flat
  const zThreshold = ctx.params.zThreshold;

  if (z > zThreshold) {
    // z > 2: short BTC, long ETH equal-notional
    return { BTCUSDT: -0.5, ETHUSDT: 0.5 };
  } else if (z < -zThreshold) {
    // z < -2: long BTC, short ETH equal-notional
    return { BTCUSDT: 0.5, ETHUSDT: -0.5 };
  } else {
    // z between -2 and 2: flat
    return {};
  }
}
