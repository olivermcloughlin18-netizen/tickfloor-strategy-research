export const meta = {
  id: "r27-sector-mom1m",
  name: "Sector ETF 1-month momentum, top 3 of 11",
  family: "momentum",
  source:
    "Moskowitz & Grinblatt 1999 JF 'Do industries explain momentum?' (industry momentum is strongest at the 1-month horizon, opposite to stock-level 1-month reversal)",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "XLC", "VNQ"],
  rebalance: "monthly",
  params: { lag: 2, lookback: 21, need: 23, top: 3, minNames: 6 },
};

export function rank(universe, t, ctx) {
  const { lag, lookback, need, top, minNames } = ctx.params;
  const symbols = Object.keys(universe);
  const scores = [];
  for (const sym of symbols) {
    const b = universe[sym];
    if (b.length < need) continue;
    const e = b.length - lag;
    const recent = b[e].close;
    const prior = b[e - lookback].close;
    if (!Number.isFinite(recent) || !Number.isFinite(prior) || recent <= 0 || prior <= 0) continue;
    scores.push([sym, recent / prior - 1]);
  }
  if (scores.length < minNames) {
    const w = {};
    for (const sym of symbols) w[sym] = 1 / symbols.length;
    return w;
  }
  scores.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const w = {};
  for (const [sym] of scores.slice(0, top)) w[sym] = 1 / top;
  return w;
}
