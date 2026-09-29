export const meta = {
  id: "trend-risk-parity-trend-overlay",
  name: "Risk-parity core + trend overlay filter",
  family: "trend-managed-futures",
  source: "AQR 'Trend-Following Overlays' research notes; Dalio All Weather concept",
  assetClass: "etf",
  timeframe: "1d",
  universe: "ETFS_DAILY",
  rebalance: "monthly",
  params: {
    volWindow: 60,
    smaWindow: 200,
  },
};

export function rank(universe, t, ctx) {
  const symbols = ["SPY", "TLT", "GLD"];
  const w = {};

  for (const sym of symbols) {
    if (!(sym in universe)) continue;
    const b = universe[sym];

    // Need at least 200 bars for 200-day SMA and 60-day vol
    if (b.length < ctx.params.smaWindow) continue;

    const currentClose = b[b.length - 1].close;

    // 200-day SMA
    let smaSum = 0;
    for (let i = b.length - ctx.params.smaWindow; i < b.length; i++) {
      smaSum += b[i].close;
    }
    const sma200 = smaSum / ctx.params.smaWindow;

    // Only consider sleeve if price is above 200-day SMA
    if (currentClose < sma200) continue;

    // 60-day realized volatility
    if (b.length < ctx.params.volWindow) continue;
    const returns = [];
    for (let i = b.length - ctx.params.volWindow; i < b.length; i++) {
      const ret = (b[i].close - b[i - 1].close) / b[i - 1].close;
      returns.push(ret);
    }

    const meanRet =
      returns.reduce((a, r) => a + r, 0) / returns.length;
    const variance = returns.reduce(
      (a, r) => a + (r - meanRet) * (r - meanRet),
      0
    ) / returns.length;
    const vol = Math.sqrt(variance);

    // Avoid division by zero
    if (vol <= 0) continue;

    // Store inverse volatility for this sleeve
    w[sym] = 1 / vol;
  }

  // Normalize weights so they sum to at most 1 (remaining is cash)
  const totalInvVol = Object.values(w).reduce((a, b) => a + b, 0);
  if (totalInvVol > 0) {
    for (const sym in w) {
      w[sym] = w[sym] / totalInvVol;
    }
  }

  return w;
}
