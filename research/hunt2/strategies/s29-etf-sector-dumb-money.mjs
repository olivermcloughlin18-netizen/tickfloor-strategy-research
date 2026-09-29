export const meta = {
  id: "s29-etf-sector-dumb-money",
  name: "Contrarian to sector dollar-volume share inflows (dumb money)",
  family: "sentiment",
  source: "Frazzini & Lamont 2008 JFE ('Dumb money: mutual fund flows and the cross-section of stock returns')",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB"],
  rebalance: "monthly",
  longShort: false,
  params: { recent: 21, base: 105, top: 3 },
};

export function rank(universe, t, ctx) {
  const { recent, base, top } = ctx.params;
  const window = recent + base;
  if (meta.assets.some((symbol) => !universe[symbol] || universe[symbol].length < window)) return {};

  const recentShares = {};
  const baseShares = {};
  for (const symbol of meta.assets) {
    recentShares[symbol] = 0;
    baseShares[symbol] = 0;
  }

  for (let offset = 0; offset < window; offset++) {
    let total = 0;
    for (const symbol of meta.assets) {
      const bars = universe[symbol];
      const bar = bars[bars.length - 1 - offset];
      total += bar.close * bar.volume;
    }
    for (const symbol of meta.assets) {
      const bars = universe[symbol];
      const bar = bars[bars.length - 1 - offset];
      const share = bar.close * bar.volume / total;
      if (offset < recent) recentShares[symbol] += share;
      else baseShares[symbol] += share;
    }
  }

  const scores = meta.assets.map((symbol) => [
    symbol,
    (recentShares[symbol] / recent) / (baseShares[symbol] / base) - 1,
  ]);
  scores.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));

  const weights = {};
  for (const [symbol] of scores.slice(0, top)) weights[symbol] = 1 / top;
  return weights;
}
