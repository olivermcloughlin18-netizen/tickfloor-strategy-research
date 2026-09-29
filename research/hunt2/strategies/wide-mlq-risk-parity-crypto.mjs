// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "wide-mlq-risk-parity-crypto",
  name: "Inverse-volatility risk parity across crypto majors (wide US stocks)",
  family: "volatility",
  source: "Qian, E. (2005) 'Risk Parity Portfolios', PanAgora",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "weekly",
  params: { volWindow: 20, capWeight: 0.50 },
};

// Inverse-volatility risk parity: weight assets inversely to their volatility.
// Weight_i = (1/sigma_i) / sum(1/sigma_j), capped at 50%.
// sigma_i = 20-day realized daily-return volatility.
export function rank(universe, t, ctx) {
  const volWindow = ctx.params.volWindow;
  const capWeight = ctx.params.capWeight;

  const weights = {};
  const invVolScores = [];

  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];
    // Need at least volWindow + 1 bars to compute volWindow returns
    if (bars.length < volWindow + 1) continue;

    // Compute 20-day realized daily-return volatility
    let sumSqDev = 0;
    for (let k = bars.length - volWindow; k < bars.length; k++) {
      const ret = (bars[k].close - bars[k - 1].close) / bars[k - 1].close;
      sumSqDev += ret * ret;
    }
    const variance = sumSqDev / volWindow;
    const sigma = Math.sqrt(variance);

    // Avoid division by zero
    if (sigma > 0) {
      invVolScores.push([sym, 1 / sigma]);
    }
  }

  // Normalize inverse-vol scores to weights
  const totalInvVol = invVolScores.reduce((sum, [_, invVol]) => sum + invVol, 0);

  if (totalInvVol === 0) return weights;

  for (const [sym, invVol] of invVolScores) {
    let w = invVol / totalInvVol;
    // Cap at 50%
    if (w > capWeight) w = capWeight;
    weights[sym] = w;
  }

  // Renormalize if capping occurred (to keep sum close to 1)
  const sumWeights = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sumWeights > 0 && sumWeights < 1) {
    for (const sym of Object.keys(weights)) {
      weights[sym] = weights[sym] / sumWeights;
    }
  }

  return weights;
}
