// Inverse realized-vol percentile position scaling (crypto cross-sectional)
// Monthly rebalance: rank top-30 assets by 30d quote volume; weight inversely to 30d realized vol

export const meta = {
  id: "vol-realized-vol-percentile-position-scaling",
  name: "Inverse realized-vol percentile position scaling (crypto cross-sectional)",
  family: "volatility",
  source: "Asness, Frazzini, Pedersen 2012 'Leverage Aversion and Risk Parity'",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "monthly",
  params: {
    volumeWindow: 30,   // 30d quote volume for ranking
    volWindow: 30,      // 30d realized vol calculation
    maxAssets: 30,      // top-30 by volume
    capPerAsset: 0.20   // 20% cap per asset
  }
};

// Compute 30d realized volatility from daily returns
function realizedVol(bars, lookback) {
  if (bars.length < lookback + 1) return null;
  let sumSqReturns = 0;
  for (let i = bars.length - lookback; i < bars.length; i++) {
    const ret = (bars[i].close - bars[i - 1].close) / bars[i - 1].close;
    sumSqReturns += ret * ret;
  }
  return Math.sqrt(sumSqReturns / lookback);
}

// Compute 30d quote volume (sum of volume over window)
function quoteVolume(bars, lookback) {
  if (bars.length < lookback) return 0;
  let sum = 0;
  for (let i = bars.length - lookback; i < bars.length; i++) {
    sum += bars[i].volume * bars[i].close;
  }
  return sum;
}

export function rank(universe, t, ctx) {
  const p = ctx.params;

  // Collect scores: [symbol, 30d quote volume, 30d realized vol]
  const candidates = [];
  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];

    // Need at least volWindow days for realized vol calculation
    if (bars.length < p.volWindow + 1) continue;

    const vol = realizedVol(bars, p.volWindow);
    const qvol = quoteVolume(bars, p.volumeWindow);

    // Skip if vol is 0 or null (edge case)
    if (!vol || vol === 0 || qvol === 0) continue;

    candidates.push({ sym, qvol, vol });
  }

  // Sort by quote volume descending, take top-30
  candidates.sort((a, b) => b.qvol - a.qvol);
  const top30 = candidates.slice(0, p.maxAssets);

  if (top30.length === 0) return {};

  // Weight inversely to realized volatility
  // weight_raw = 1/vol
  // weight_normalized = weight_raw / sum(weight_raw)
  let sumInvVol = 0;
  const weights_raw = [];

  for (const item of top30) {
    const invVol = 1 / item.vol;
    weights_raw.push({ sym: item.sym, invVol });
    sumInvVol += invVol;
  }

  // Normalize and apply cap
  const w = {};
  let totalAllocated = 0;
  const uncappedWeights = [];

  for (const item of weights_raw) {
    let weight = item.invVol / sumInvVol;
    uncappedWeights.push({ sym: item.sym, weight });
  }

  // First pass: apply cap
  for (const item of uncappedWeights) {
    if (item.weight > p.capPerAsset) {
      w[item.sym] = p.capPerAsset;
      totalAllocated += p.capPerAsset;
    }
  }

  // Second pass: distribute uncapped weights
  let uncappedTotal = 0;
  for (const item of uncappedWeights) {
    if (item.weight <= p.capPerAsset) {
      uncappedTotal += item.weight;
    }
  }

  // Redistribute capped weights proportionally among uncapped assets
  if (uncappedTotal > 0) {
    for (const item of uncappedWeights) {
      if (item.weight <= p.capPerAsset) {
        const remainingCapacity = 1 - totalAllocated;
        w[item.sym] = (item.weight / uncappedTotal) * remainingCapacity;
      }
    }
  }

  return w;
}
