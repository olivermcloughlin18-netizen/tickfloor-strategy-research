export const meta = {
  id: "s29-cx-fng-surge",
  name: "Sentiment surge out of fear (7-day Fear & Greed jump)",
  family: "sentiment",
  source: "Baker & Wurgler 2006 JF (sentiment shifts); alternative.me Crypto Fear & Greed index",
  assetClass: "crypto",
  timeframe: "1d",
  assets: ["BTCUSDT","BNBUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","LTCUSDT","LINKUSDT","TRXUSDT","BCHUSDT","ATOMUSDT","ETCUSDT","DASHUSDT","ZECUSDT","AVAXUSDT","UNIUSDT","NEARUSDT","AAVEUSDT","HBARUSDT"],
  params: { lag: 7, jump: 20, fearMax: 30, holdBars: 10 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  const s = ctx.state;
  if (s.hold === undefined) s.hold = 0;
  if (s.hold > 0) { s.hold--; return 1; }
  if (i < p.lag) return 0;
  const g = ctx.macro("FNG", i), g0 = ctx.macro("FNG", i - p.lag);
  if (g === null || g0 === null) return 0;
  if (g - g0 >= p.jump && g0 <= p.fearMax) { s.hold = p.holdBars - 1; return 1; }
  return 0;
}
