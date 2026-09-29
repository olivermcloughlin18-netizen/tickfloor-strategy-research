export const meta = {
  id: "s29-cx-funding-washout-rebound",
  name: "Funding reset after a leverage washout",
  family: "mean_reversion",
  source: "Schmeling, Schrimpf & Todorov 2023 (funding spikes precede crashes); CryptoQuant/Glassnode 'funding reset' deleveraging commentary",
  assetClass: "crypto",
  timeframe: "1d",
  assets: [
    "BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT",
    "LINKUSDT", "TRXUSDT", "BCHUSDT", "ATOMUSDT", "ETCUSDT", "DASHUSDT",
    "ZECUSDT", "AVAXUSDT", "UNIUSDT", "NEARUSDT", "AAVEUSDT", "HBARUSDT",
  ],
  longShort: false,
  holdBars: 10,
  params: {
    lookback: 14,
    hotFunding: 0.0003,
    resetFunding: 0.00005,
    drawdown: 0.15,
    holdBars: 10,
  },
};

export function signal(bars, i, ctx) {
  const { lookback, hotFunding, resetFunding, drawdown } = ctx.params;
  if (i < lookback) return 0;

  const funding = ctx.fundingRate(i);
  if (funding === null) return 0;

  let maxFunding = -Infinity;
  let maxClose = -Infinity;
  for (let k = i - lookback; k < i; k++) {
    const priorFunding = ctx.fundingRate(k);
    if (priorFunding === null) return 0;
    if (priorFunding > maxFunding) maxFunding = priorFunding;
    if (bars[k].close > maxClose) maxClose = bars[k].close;
  }

  return funding <= resetFunding
    && maxFunding >= hotFunding
    && bars[i].close <= (1 - drawdown) * maxClose
    ? 1
    : 0;
}
