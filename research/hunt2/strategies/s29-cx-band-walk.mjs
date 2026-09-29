export const meta = {
  id: "s29-cx-band-walk",
  name: "Walking the upper Bollinger band (expanding-band continuation)",
  family: "trend",
  source: "Bollinger 2001 'Bollinger on Bollinger Bands' (walking the bands)",
  assetClass: "crypto",
  timeframe: "1d",
  assets: [
    "BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT",
    "LINKUSDT", "TRXUSDT", "BCHUSDT", "ATOMUSDT", "ETCUSDT", "DASHUSDT",
    "ZECUSDT", "AVAXUSDT", "UNIUSDT", "NEARUSDT", "AAVEUSDT", "HBARUSDT",
  ],
  longShort: false,
  params: { n: 20, k: 2, closesAbove: 3, of: 5, bwLag: 5 },
};

export function signal(bars, i, ctx) {
  if (ctx.state.pos === undefined) ctx.state.pos = 0;
  if (i < 25) return 0;

  const { n, k, closesAbove, of, bwLag } = ctx.params;
  const mean = ctx.sma("close", n, i);

  if (ctx.state.pos === 1) {
    if (bars[i].close < mean) ctx.state.pos = 0;
    return ctx.state.pos;
  }

  let above = 0;
  for (let j = i - of + 1; j <= i; j++) {
    const upper = ctx.sma("close", n, j) + k * ctx.rollingStd("close", n, j);
    if (bars[j].close > upper) above++;
  }

  const std = ctx.rollingStd("close", n, i);
  const lagMean = ctx.sma("close", n, i - bwLag);
  const lagStd = ctx.rollingStd("close", n, i - bwLag);
  if (above >= closesAbove && 2 * k * std / mean > 2 * k * lagStd / lagMean) {
    ctx.state.pos = 1;
  }
  return ctx.state.pos;
}
