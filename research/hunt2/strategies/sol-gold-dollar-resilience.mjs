export const meta = {
  id: "sol-gold-dollar-resilience",
  name: "Gold holds up through broad dollar strength",
  family: "macro-disagreement",
  source: "https://www.federalreserve.gov/Releases/H10/",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["GLD", "AGG", "QQQ"],
  rebalance: "daily",
  longShort: false,
  params: {
    lookbackDays: 21,
    minDollarReturn: 0.02,
    minGoldReturn: 0,
    holdDays: 21,
    assetWarmupBars: 64,
  },
};

const ASSETS = ["GLD", "AGG", "QQQ"];
const BASELINE = { GLD: 1 / 3, AGG: 1 / 3, QQQ: 1 / 3 };

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const state = ctx.state;
  if (state.dollars === undefined) {
    state.dollars = [];
    state.previous = false;
    state.hold = 0;
  }

  const dollar = ctx.macro("DTWEXBGS");
  if (dollar !== null) state.dollars.push(dollar);

  if (!ASSETS.every((asset) => universe[asset] && universe[asset].length >= p.assetWarmupBars)) {
    return BASELINE;
  }

  const gold = universe.GLD;
  const n = p.lookbackDays;
  let condition = false;
  if (state.dollars.length >= n + 1 && gold.length >= n + 1) {
    const dollarReturn = state.dollars[state.dollars.length - 1] / state.dollars[state.dollars.length - 1 - n] - 1;
    const goldReturn = gold[gold.length - 1].close / gold[gold.length - 1 - n].close - 1;
    condition = dollarReturn >= p.minDollarReturn && goldReturn >= p.minGoldReturn;
  }

  if (state.hold === 0 && condition && !state.previous) state.hold = p.holdDays;
  state.previous = condition;

  if (state.hold > 0) {
    state.hold--;
    return { GLD: 1 };
  }
  return BASELINE;
}
