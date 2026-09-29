// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "macro-risk-onoff-sector-rotation-xly-xlp",
  name: "Consumer discretionary vs staples ratio (XLY/XLP) as risk-on/off rotation signal",
  family: "macro-intermarket",
  source: "Sam Stovall 'Sector Investing' (S&P sector rotation framework); Fidelity/State Street sector strategist commentary",
  assetClass: "etf",
  timeframe: "1d",
  universe: "ETFS_DAILY",
  rebalance: "daily",
  params: { smaWindow: 50 },
};

// portfolio strategy: rank returns weights for all assets in universe
export function rank(universe, t, ctx) {
  const n = ctx.params.smaWindow;

  // Check if both XLY and XLP have enough data
  const xly = universe['XLY'];
  const xlp = universe['XLP'];

  if (!xly || !xlp || xly.length < n || xlp.length < n) {
    // Not enough history; equal-weight all assets
    const w = {};
    for (const sym of Object.keys(universe)) {
      w[sym] = 1 / Object.keys(universe).length;
    }
    return w;
  }

  // Compute XLY/XLP ratio for the past n bars and calculate SMA
  let ratioSum = 0;
  for (let k = xly.length - n; k < xly.length; k++) {
    const r = xly[k].close / xlp[k].close;
    ratioSum += r;
  }
  const sma = ratioSum / n;

  // Current ratio at time t
  const currentRatio = xly[xly.length - 1].close / xlp[xlp.length - 1].close;

  // Risk-on (ratio > SMA): long risk assets (QQQ, sector ETFs)
  // Risk-off (ratio < SMA): long defensive assets
  const isRiskOn = currentRatio > sma;

  const w = {};

  if (isRiskOn) {
    // Long QQQ (growth/tech) and cyclical sectors
    const riskAssets = ['QQQ', 'XLY', 'XLK', 'XLV'];
    const available = riskAssets.filter(s => s in universe);
    if (available.length > 0) {
      const wt = 1 / available.length;
      for (const sym of available) w[sym] = wt;
    }
  } else {
    // Risk-off: defensive assets (staples, utilities, bonds)
    const defAssets = ['XLP', 'XLU', 'TLT', 'IEF'];
    const available = defAssets.filter(s => s in universe);
    if (available.length > 0) {
      const wt = 1 / available.length;
      for (const sym of available) w[sym] = wt;
    }
  }

  return w;
}
