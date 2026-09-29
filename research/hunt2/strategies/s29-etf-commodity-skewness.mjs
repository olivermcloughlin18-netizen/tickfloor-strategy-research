export const meta = {
  id: "s29-etf-commodity-skewness",
  name: "Low-skewness commodity ETFs",
  family: "other",
  source: "Fernandez-Perez, Frijns, Fuertes & Miffre 2018 JBF ('The skewness of commodity futures returns')",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["GLD", "SLV", "USO", "UNG", "DBC"],
  rebalance: "monthly",
  longShort: false,
  params: { window: 252, top: 2 },
};

export function rank(universe, t, ctx) {
  const { window, top } = ctx.params;
  const scores = [];

  for (const symbol of meta.assets) {
    const bars = universe[symbol];
    if (!bars || bars.length < window + 1) continue;

    const end = bars.length - 1;
    let mean = 0;
    for (let i = end - window + 1; i <= end; i++) mean += bars[i].close / bars[i - 1].close - 1;
    mean /= window;

    let second = 0;
    let third = 0;
    for (let i = end - window + 1; i <= end; i++) {
      const deviation = bars[i].close / bars[i - 1].close - 1 - mean;
      second += deviation * deviation;
      third += deviation * deviation * deviation;
    }
    second /= window;
    third /= window;
    const skew = third / (second ** 1.5);
    if (Number.isFinite(skew)) scores.push([symbol, skew]);
  }

  scores.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
  const weights = {};
  for (const [symbol] of scores.slice(0, top)) weights[symbol] = 1 / top;
  return weights;
}
