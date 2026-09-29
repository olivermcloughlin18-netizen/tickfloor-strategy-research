// prereg-2026-09-25 control for the 12-1 confirmatory test (section 8): the frozen
// wide-mom12_1_stocks.mjs rule with the sort reversed and a 21-session lookback, i.e. hold the 4
// names with the LOWEST 21-session return, monthly, same timing, same warm-up, same costs.
export const meta = {
  id: "r25-ctrl-conf-drop4",
  name: "Control: 1-month drop, bottom 4, monthly (confirmatory 12-1 test)",
  family: "deep-validation-control",
  source: "Preregistered matched buy-after-a-drop control for the wide-mom12_1_stocks confirmatory test",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { lookback: 21, top: 4 },
};

export function rank(universe, t, ctx) {
  const { lookback, top } = ctx.params;
  const scores = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < lookback + 1) continue;
    scores.push([sym, b[b.length - 1].close / b[b.length - 1 - lookback].close - 1]);
  }
  if (scores.length < top * 2) return {};
  scores.sort((x, y) => x[1] - y[1] || (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
  const w = {};
  for (const [sym] of scores.slice(0, top)) w[sym] = 1 / top;
  return w;
}
