export const meta = {
  id: "r24b-ctrl-drop-sector-etf",
  name: "Sector ETF Drop Control",
  family: "deep-validation-control",
  source: "Preregistered control",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "XLC", "VNQ"],
  universe: "ETFS_DAILY",
  rebalance: "monthly",
  params: { need: 23, lag: 2, lookback: 21, hold: 3, minNames: 6 },
};

export function rank(universe, t, ctx) {
  const scores = [];
  const symbols = Object.keys(universe);
  for (const sym of symbols) {
    const b = universe[sym];
    if (b.length < ctx.params.need) continue;
    const e = b.length - ctx.params.lag;
    const recent = b[e].close;
    const prior = b[e - ctx.params.lookback].close;
    if (!Number.isFinite(recent) || !Number.isFinite(prior) || recent <= 0 || prior <= 0) continue;
    scores.push([sym, recent / prior - 1]);
  }
  if (scores.length < ctx.params.minNames) {
    const w = {};
    for (const sym of symbols) w[sym] = 1 / symbols.length;
    return w;
  }
  scores.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const w = {};
  for (const [sym] of scores.slice(0, ctx.params.hold)) w[sym] = 1 / ctx.params.hold;
  return w;
}
