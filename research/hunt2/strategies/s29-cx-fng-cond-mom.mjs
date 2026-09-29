export const meta = {
  id: "s29-cx-fng-cond-mom",
  name: "Two-week momentum only in greed, BTC in fear",
  family: "momentum",
  source: "Antoniou, Doukas & Subrahmanyam 2013 JFQA (sentiment and momentum); alternative.me F&G",
  assetClass: "crypto",
  timeframe: "1d",
  assets: [
    "BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT",
    "LINKUSDT", "TRXUSDT", "BCHUSDT", "ATOMUSDT", "ETCUSDT", "DASHUSDT",
    "ZECUSDT", "AVAXUSDT", "UNIUSDT", "NEARUSDT", "AAVEUSDT", "HBARUSDT",
  ],
  rebalance: "weekly",
  longShort: false,
  params: { greed: 60, fear: 40, lookback: 14, top: 4 },
};

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const eligible = [];
  for (const symbol of Object.keys(universe)) {
    const bars = universe[symbol];
    if (bars.length < p.lookback + 1) continue;
    const i = bars.length - 1;
    eligible.push([symbol, bars[i].close / bars[i - p.lookback].close - 1]);
  }

  const greed = ctx.macro("FNG");
  if (greed !== null && greed >= p.greed) {
    eligible.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    const weights = {};
    for (const [symbol] of eligible.slice(0, p.top)) weights[symbol] = 1 / p.top;
    return weights;
  }
  if (greed !== null && greed <= p.fear) return { BTCUSDT: 1 };

  const weights = {};
  for (const [symbol] of eligible) weights[symbol] = 1 / eligible.length;
  return weights;
}
