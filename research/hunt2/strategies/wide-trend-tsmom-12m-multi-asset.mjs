// Moskowitz/Ooi/Pedersen 12-month time-series momentum
// For each asset: if 12m return > 0, size inversely to vol (target 10%, cap 40%);
// if 12m return <= 0, go flat. Monthly rebalance across ETF universe.

export const meta = {
  id: "wide-trend-tsmom-12m-multi-asset",
  name: "Time-series momentum (Moskowitz/Ooi/Pedersen 12-month) (wide US stocks)",
  family: "trend-managed-futures",
  source: "Moskowitz, Ooi, Pedersen (2012) JFE",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  longShort: true,
  params: {
    monthLookback: 252,      // 12 months of trading days
    volWindow: 60,           // 60 day trailing realized vol
    volTarget: 0.10,         // 10% target vol
    positionCap: 0.40        // 40% max position per asset
  },
};

export function rank(universe, t, ctx) {
  const { monthLookback, volWindow, volTarget, positionCap } = ctx.params;
  const weights = {};
  let grossWeight = 0;

  // First pass: compute raw weights
  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];

    // Need enough bars: 12m lookback + vol window
    if (bars.length < monthLookback + volWindow) {
      weights[sym] = 0;
      continue;
    }

    // 12-month return
    const now = bars[bars.length - 1].close;
    const thenIdx = bars.length - monthLookback - 1;
    const then = bars[thenIdx].close;
    const ret12m = (now - then) / then;

    // If negative return, go flat
    if (ret12m <= 0) {
      weights[sym] = 0;
      continue;
    }

    // Calculate 60-day realized volatility
    let sumSqReturn = 0;
    for (let i = bars.length - volWindow; i < bars.length; i++) {
      const dailyRet = (bars[i].close - bars[i - 1].close) / bars[i - 1].close;
      sumSqReturn += dailyRet * dailyRet;
    }
    const dailyVol = Math.sqrt(sumSqReturn / volWindow);
    const annualizedVol = dailyVol * Math.sqrt(252);

    // Avoid division by zero, position size = vol target / annualized vol
    if (annualizedVol <= 0) {
      weights[sym] = volTarget;
    } else {
      weights[sym] = volTarget / annualizedVol;
    }
    grossWeight += weights[sym];
  }

  // Second pass: normalize to sum to 1 if we have positive exposure
  if (grossWeight > 1) {
    for (const sym of Object.keys(weights)) {
      weights[sym] /= grossWeight;
    }
  }

  return weights;
}
