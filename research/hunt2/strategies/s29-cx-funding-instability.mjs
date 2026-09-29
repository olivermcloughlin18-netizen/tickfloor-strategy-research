export const meta = {
  id: "s29-cx-funding-instability",
  name: "Trend with a stand-down when funding becomes unstable",
  family: "volatility",
  source: "He, Manela, Ross & von Wachter 2022 'Fundamentals of perpetual futures' (funding volatility = arbitrage-capital stress); Brunnermeier & Pedersen 2009",
  assetClass: "crypto",
  timeframe: "1d",
  assets: [
    "BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT",
    "LINKUSDT", "TRXUSDT", "BCHUSDT", "ATOMUSDT", "ETCUSDT", "DASHUSDT",
    "ZECUSDT", "AVAXUSDT", "UNIUSDT", "NEARUSDT", "AAVEUSDT", "HBARUSDT",
  ],
  longShort: false,
  params: { sdWindow: 21, medWindow: 180, mult: 2, sma: 50 },
};

export function signal(bars, i, ctx) {
  if (ctx.state.f === undefined) ctx.state.f = [];
  if (ctx.state.sd === undefined) ctx.state.sd = [];

  const funding = ctx.fundingRate(i);
  if (funding === null) return 0;
  ctx.state.f.push(funding);

  const { sdWindow, medWindow, mult, sma } = ctx.params;
  if (ctx.state.f.length < sdWindow) return 0;

  const recent = ctx.state.f.slice(-sdWindow);
  let mean = 0;
  for (const value of recent) mean += value;
  mean /= sdWindow;

  let squaredDifferences = 0;
  for (const value of recent) squaredDifferences += (value - mean) ** 2;
  const sd21 = Math.sqrt(squaredDifferences / (sdWindow - 1));
  ctx.state.sd.push(sd21);

  if (ctx.state.sd.length < medWindow + 1 || i < sma - 1) return 0;

  const prior = ctx.state.sd.slice(-medWindow - 1, -1).sort((a, b) => a - b);
  const middle = medWindow / 2;
  const median = (prior[middle - 1] + prior[middle]) / 2;

  if (sd21 > mult * median) return 0;
  return bars[i].close > ctx.sma("close", sma, i) ? 1 : 0;
}
