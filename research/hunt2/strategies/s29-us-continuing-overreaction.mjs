export const meta = {
  id: "s29-us-continuing-overreaction",
  name: "Continuing overreaction (signed-volume-weighted past returns)",
  family: "momentum",
  source: "Byun, Lim & Yun 2016 JFQA ('Continuing overreaction and stock return predictability')",
  assetClass: "us_stock",
  timeframe: "1d",
  assets: ["AAPL", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "JPM", "V", "UNH", "XOM", "JNJ", "COST", "ABBV", "MRK", "AVGO", "CVX", "WMT", "BAC", "ORCL", "ADBE", "CRM", "NFLX", "AMD", "INTC", "ABT", "MCD", "DIS", "QCOM", "TXN", "HON", "CAT", "LOW", "SBUX", "BA", "UPS", "PFE", "T", "MDT", "UNP", "MMM"],
  longShort: false,
  rebalance: "monthly",
  params: { blocks: 12, blockLen: 21, top: 8 },
};

export function rank(universe, t, ctx) {
  const { blocks, blockLen, top } = ctx.params;
  const need = blocks * blockLen + 1;
  const scores = [];

  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];
    if (bars.length < need) continue;

    let weighted = 0;
    let totalVolume = 0;
    for (let j = 1; j <= blocks; j++) {
      const end = bars.length - 1 - (j - 1) * blockLen;
      const start = end - blockLen + 1;
      let volume = 0;
      for (let k = start; k <= end; k++) volume += bars[k].volume;
      const blockReturn = bars[end].close / bars[start - 1].close - 1;
      weighted += (blocks + 1 - j) * Math.sign(blockReturn) * volume;
      totalVolume += volume;
    }

    const meanVolume = totalVolume / blocks;
    if (meanVolume > 0) scores.push([sym, weighted / meanVolume]);
  }

  scores.sort((a, b) => b[1] - a[1]);
  const weights = {};
  for (const [sym] of scores.slice(0, top)) weights[sym] = 1 / top;
  return weights;
}
