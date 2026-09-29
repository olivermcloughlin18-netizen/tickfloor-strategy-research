export const meta = {
  id: "s29-us-vix-beta__rob1",
  name: "Aggregate-volatility risk: long the lowest VIX-beta stocks (-25%)",
  family: "volatility",
  source: "Ang, Hodrick, Xing & Zhang 2006 JF ('The cross-section of volatility and expected returns': high VIX-innovation beta earns low returns)",
  assetClass: "us_stock",
  timeframe: "1d",
  assets: ["AAPL","NVDA","AMZN","GOOGL","META","TSLA","JPM","V","UNH","XOM","JNJ","COST","ABBV","MRK","AVGO","CVX","WMT","BAC","ORCL","ADBE","CRM","NFLX","AMD","INTC","ABT","MCD","DIS","QCOM","TXN","HON","CAT","LOW","SBUX","BA","UPS","PFE","T","MDT","UNP","MMM"],
  rebalance: "daily",
  longShort: false,
  params: { window: 189, top: 8 },
};

function slope(pairs) {
  let mx = 0;
  let my = 0;
  for (const [x, y] of pairs) {
    mx += x;
    my += y;
  }
  mx /= pairs.length;
  my /= pairs.length;

  let cov = 0;
  let variance = 0;
  for (const [x, y] of pairs) {
    cov += (x - mx) * (y - my);
    variance += (x - mx) ** 2;
  }
  return variance > 0 ? cov / variance : NaN;
}

export function rank(universe, t, ctx) {
  const state = ctx.state;
  if (state.vix === undefined) {
    state.vix = [];
    state.pairs = {};
    state.weights = {};
  }

  const v = ctx.macro("VIX");
  state.vix.push(v);
  const previousV = state.vix.length > 1 ? state.vix[state.vix.length - 2] : null;
  const dV = Number.isFinite(v) && Number.isFinite(previousV) ? v - previousV : NaN;

  if (Number.isFinite(dV) && state.previousT !== undefined) {
    for (const sym of Object.keys(universe)) {
      const bars = universe[sym];
      const n = bars.length;
      if (n < 3 || bars[n - 2].time !== state.previousT) continue;
      const r = bars[n - 2].close / bars[n - 3].close - 1;
      if (!Number.isFinite(r)) continue;
      if (state.pairs[sym] === undefined) state.pairs[sym] = [];
      state.pairs[sym].push([dV, r]);
      if (state.pairs[sym].length > ctx.params.window) state.pairs[sym].shift();
    }
  }
  state.previousT = t;

  const date = new Date(t * 1000);
  const monthKey = date.getUTCFullYear() * 12 + date.getUTCMonth();
  if (state.monthKey === monthKey) return state.weights;
  state.monthKey = monthKey;

  const scores = [];
  for (const sym of Object.keys(universe)) {
    const pairs = state.pairs[sym];
    if (pairs === undefined || pairs.length < ctx.params.window) continue;
    const beta = slope(pairs.slice(-ctx.params.window));
    if (Number.isFinite(beta)) scores.push([sym, beta]);
  }
  scores.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

  state.weights = {};
  if (scores.length < ctx.params.top) return state.weights;
  for (const [sym] of scores.slice(0, ctx.params.top)) state.weights[sym] = 1 / ctx.params.top;
  return state.weights;
}
