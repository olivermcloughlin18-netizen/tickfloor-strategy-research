export const meta = {
  id: "sol-gold-real-rate-lag",
  name: "Gold lag after a known real-yield fall",
  family: "rate-decomposition",
  source: "https://www.federalreserve.gov/data/tips-yield-curve-and-inflation-compensation.htm",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["GLD", "AGG", "QQQ"],
  rebalance: "daily",
  longShort: false,
  params: {
    lookbackDays: 21,
    maxRealYieldChangePp: -0.2,
    holdDays: 21,
    minGoldLagReturn: 0.05,
    assetWarmupBars: 64,
  },
};

const ASSETS = ["GLD", "AGG", "QQQ"];
const BASELINE = { GLD: 1 / 3, AGG: 1 / 3, QQQ: 1 / 3 };

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const state = ctx.state;
  if (state.yields === undefined) {
    state.yields = [];
    state.previous = false;
    state.hold = 0;
  }

  const realYield = ctx.macro("DFII10");
  if (realYield !== null) state.yields.push(realYield);

  if (!ASSETS.every((asset) => universe[asset] && universe[asset].length >= p.assetWarmupBars)) {
    return BASELINE;
  }

  const gold = universe.GLD;
  const bonds = universe.AGG;
  const n = p.lookbackDays;
  let condition = false;

  if (state.yields.length >= n + 1 && gold.length >= n + 1 && bonds.length >= n + 1) {
    const yieldChange = state.yields[state.yields.length - 1] - state.yields[state.yields.length - 1 - n];
    const goldReturn = gold[gold.length - 1].close / gold[gold.length - 1 - n].close - 1;
    const bondReturn = bonds[bonds.length - 1].close / bonds[bonds.length - 1 - n].close - 1;
    condition = yieldChange <= p.maxRealYieldChangePp && goldReturn <= bondReturn - p.minGoldLagReturn;
  }

  if (state.hold === 0 && condition && !state.previous) state.hold = p.holdDays;
  state.previous = condition;

  if (state.hold > 0) {
    state.hold--;
    return { GLD: 1 };
  }
  return BASELINE;
}
