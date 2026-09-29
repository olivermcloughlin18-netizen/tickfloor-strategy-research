export const meta = {
  id: "s29-us-vix-crush-beta",
  name: "High-beta stocks after a VIX crush",
  family: "volatility",
  source: "Daniel & Moskowitz 2016 JFE (rebounds after panic); Frazzini & Pedersen 2014 (beta); VIX mean-reversion literature",
  assetClass: "us_stock",
  timeframe: "1d",
  assets: ["AAPL","NVDA","AMZN","GOOGL","META","TSLA","JPM","V","UNH","XOM","JNJ","COST","ABBV","MRK","AVGO","CVX","WMT","BAC","ORCL","ADBE","CRM","NFLX","AMD","INTC","ABT","MCD","DIS","QCOM","TXN","HON","CAT","LOW","SBUX","BA","UPS","PFE","T","MDT","UNP","MMM"],
  rebalance: "daily",
  longShort: false,
  params: { peakWindow: 20, peakMin: 25, crush: 0.7, holdDays: 21, betaWindow: 252, top: 8 },
};

function beta(pairs) {
  let marketMean = 0;
  let stockMean = 0;
  for (const [marketReturn, stockReturn] of pairs) {
    marketMean += marketReturn;
    stockMean += stockReturn;
  }
  marketMean /= pairs.length;
  stockMean /= pairs.length;

  let covariance = 0;
  let marketVariance = 0;
  for (const [marketReturn, stockReturn] of pairs) {
    covariance += (marketReturn - marketMean) * (stockReturn - stockMean);
    marketVariance += (marketReturn - marketMean) ** 2;
  }
  return marketVariance > 0 ? covariance / marketVariance : NaN;
}

function weights(symbols, weight) {
  const result = {};
  for (const symbol of symbols) result[symbol] = weight;
  return result;
}

export function rank(universe, t, ctx) {
  const state = ctx.state;
  const p = ctx.params;
  if (state.vix === undefined) {
    state.vix = [];
    state.pairs = {};
    state.counter = 0;
    state.held = [];
  }

  const returns = [];
  for (const symbol of Object.keys(universe)) {
    const bars = universe[symbol];
    if (bars.length < 2) continue;
    const stockReturn = bars[bars.length - 1].close / bars[bars.length - 2].close - 1;
    if (Number.isFinite(stockReturn)) returns.push([symbol, stockReturn]);
  }
  let marketReturn = 0;
  for (const [, stockReturn] of returns) marketReturn += stockReturn / returns.length;
  if (returns.length) {
    for (const [symbol, stockReturn] of returns) {
      if (state.pairs[symbol] === undefined) state.pairs[symbol] = [];
      state.pairs[symbol].push([marketReturn, stockReturn]);
      if (state.pairs[symbol].length > p.betaWindow) state.pairs[symbol].shift();
    }
  }

  const eligible = [];
  for (const symbol of Object.keys(universe)) {
    const pairs = state.pairs[symbol];
    if (pairs !== undefined && pairs.length === p.betaWindow) eligible.push(symbol);
  }

  const v = ctx.macro("VIX");
  state.vix.push(v);
  if (state.vix.length > p.peakWindow) state.vix.shift();
  let peak = -Infinity;
  for (const value of state.vix) if (Number.isFinite(value)) peak = Math.max(peak, value);

  if (state.counter === 0 && Number.isFinite(v) && peak >= p.peakMin && v <= p.crush * peak) {
    const scores = eligible.map((symbol) => [symbol, beta(state.pairs[symbol])]);
    scores.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    state.held = scores.filter(([, score]) => Number.isFinite(score)).slice(0, p.top).map(([symbol]) => symbol);
    state.counter = p.holdDays;
  }

  if (state.counter > 0) {
    state.counter--;
    return weights(state.held.filter((symbol) => Object.hasOwn(universe, symbol)), 1 / p.top);
  }
  return weights(eligible, eligible.length ? 1 / eligible.length : 0);
}
