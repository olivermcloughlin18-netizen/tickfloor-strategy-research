export const meta = {
  id: "s29-cx-fng-price-divergence",
  name: "Price down 10% while market sentiment held up (idiosyncratic sell-off)",
  family: "sentiment",
  source: "Da, Engelberg & Gao 2015 (sentiment vs price divergence); alternative.me F&G",
  assetClass: "crypto",
  timeframe: "1d",
  assets: ["BTCUSDT","BNBUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","LTCUSDT","LINKUSDT","TRXUSDT","BCHUSDT","ATOMUSDT","ETCUSDT","DASHUSDT","ZECUSDT","AVAXUSDT","UNIUSDT","NEARUSDT","AAVEUSDT","HBARUSDT"],
  params: { lag: 14, priceDrop: -0.1, holdBars: 10 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (ctx.state.rem === undefined) ctx.state.rem = 0;
  if (ctx.state.rem > 0) { ctx.state.rem--; return 1; }
  if (i < p.lag) return 0;
  const f0 = ctx.macro("FNG", i), f1 = ctx.macro("FNG", i - p.lag);
  if (f0 == null || f1 == null) return 0;
  const ret = bars[i].close / bars[i - p.lag].close - 1;
  if (ret <= p.priceDrop && f0 - f1 >= 0) { ctx.state.rem = p.holdBars - 1; return 1; }
  return 0;
}
