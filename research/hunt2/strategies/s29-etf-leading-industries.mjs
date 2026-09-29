export const meta = {
  id: "s29-etf-leading-industries",
  name: "Leading industries (retail, real estate, materials, energy) time the market",
  family: "other",
  source: "Hong, Torous & Valkanov 2007 JFE ('Do industries lead stock markets?')",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLY", "VNQ", "XLB", "XLE", "QQQ", "DIA", "IEF"],
  rebalance: "weekly",
  longShort: false,
  params: { lookback: 21 },
};

export function rank(universe, t, ctx) {
  const leaders = ["XLY", "VNQ", "XLB", "XLE"];
  const n = ctx.params.lookback;
  let lead = 0;

  for (const symbol of leaders) {
    const bars = universe[symbol];
    if (!bars || bars.length <= n) return {};
    const i = bars.length - 1;
    lead += bars[i].close / bars[i - n].close - 1;
  }

  return lead / leaders.length > 0
    ? { QQQ: 0.5, DIA: 0.5 }
    : { IEF: 1 };
}
