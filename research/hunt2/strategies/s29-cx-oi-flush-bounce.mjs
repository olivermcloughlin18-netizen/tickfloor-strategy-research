export const meta = {
  id: "s29-cx-oi-flush-bounce",
  name: "Open-interest flush bounce (forced deleveraging reversal)",
  family: "mean_reversion",
  source: "Brunnermeier & Pedersen 2009 RFS (liquidity spirals / forced selling reverts); Glassnode & Kaiko OI-flush research notes",
  assetClass: "crypto",
  timeframe: "1d",
  assets: ["BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "LINKUSDT", "TRXUSDT"],
  holdBars: 7,
  params: { lookback: 3, oiDrop: -0.12, priceDrop: -0.07, holdBars: 7 },
};

export function signal(bars, i, ctx) {
  const { lookback, oiDrop, priceDrop } = ctx.params;
  if (i < lookback) return 0;
  const o1 = ctx.openInterest(i), o0 = ctx.openInterest(i - lookback);
  if (o1 == null || o0 == null || !(o0 > 0)) return 0;
  const oiR = o1 / o0 - 1;
  const pR = bars[i].close / bars[i - lookback].close - 1;
  return oiR <= oiDrop && pR <= priceDrop ? 1 : 0;
}
