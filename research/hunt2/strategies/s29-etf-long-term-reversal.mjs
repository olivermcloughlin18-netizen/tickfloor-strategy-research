export const meta = {
  id: "s29-etf-long-term-reversal",
  name: "Cross-asset long-term reversal (value proxy)",
  family: "mean_reversion",
  source: "De Bondt & Thaler 1985 JF; Asness, Moskowitz & Pedersen 2013 JF (5-year reversal as value everywhere)",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "DIA", "XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "XLC", "VNQ", "TLT", "IEF", "SHY", "LQD", "HYG", "AGG", "GLD", "SLV", "USO", "UNG", "DBC", "UUP"],
  rebalance: "monthly",
  longShort: false,
  params: { from: 756, to: 252, top: 5, minNames: 10 },
};

export function rank(universe, t, ctx) {
  const { from, to, top, minNames } = ctx.params;
  const scores = [];

  for (const symbol of meta.assets) {
    const bars = universe[symbol];
    if (!bars || bars.length < from + 1) continue;
    const end = bars.length - 1;
    scores.push([symbol, bars[end - to].close / bars[end - from].close - 1]);
  }

  if (scores.length < minNames) return {};
  scores.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));

  const weights = {};
  for (const [symbol] of scores.slice(0, top)) weights[symbol] = 1 / top;
  return weights;
}
