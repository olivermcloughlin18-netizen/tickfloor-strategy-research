export const meta = {
  id: "s29-cx-variance-ratio-switch",
  name: "Variance-ratio regime switch (trend when VR>1.1, fade when VR<0.9)",
  family: "other",
  source: "Lo & MacKinlay 1988 RFS (variance-ratio test); Charfeddine & Maouchi 2019 (time-varying efficiency of crypto)",
  assetClass: "crypto",
  timeframe: "1d",
  assets: [
    "BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT",
    "LINKUSDT", "TRXUSDT", "BCHUSDT", "ATOMUSDT", "ETCUSDT", "DASHUSDT",
    "ZECUSDT", "AVAXUSDT", "UNIUSDT", "NEARUSDT", "AAVEUSDT", "HBARUSDT",
  ],
  longShort: true,
  params: { window: 120, q: 5, hi: 1.1, lo: 0.9, trendLb: 10, revLb: 5 },
};

export function signal(bars, i, ctx) {
  if (i < 125) return 0;

  const returns = [];
  let sum1 = 0;
  for (let k = i - ctx.params.window + 1; k <= i; k++) {
    const value = Math.log(bars[k].close / bars[k - 1].close);
    returns.push(value);
    sum1 += value;
  }
  const mean1 = sum1 / returns.length;
  let squared1 = 0;
  for (const value of returns) squared1 += (value - mean1) * (value - mean1);
  const var1 = squared1 / (returns.length - 1);

  const sums = [];
  let sum5 = 0;
  for (let k = i - 115; k <= i; k++) {
    const value = Math.log(bars[k].close / bars[k - ctx.params.q].close);
    sums.push(value);
    sum5 += value;
  }
  const mean5 = sum5 / sums.length;
  let squared5 = 0;
  for (const value of sums) squared5 += (value - mean5) * (value - mean5);
  const vr = (squared5 / (sums.length - 1)) / (ctx.params.q * var1);

  if (vr > ctx.params.hi) {
    const momentum = bars[i].close / bars[i - ctx.params.trendLb].close - 1;
    return momentum > 0 ? 1 : momentum < 0 ? -1 : 0;
  }
  if (vr < ctx.params.lo) {
    const reversal = bars[i].close / bars[i - ctx.params.revLb].close - 1;
    return reversal > 0 ? -1 : reversal < 0 ? 1 : 0;
  }
  return 0;
}
