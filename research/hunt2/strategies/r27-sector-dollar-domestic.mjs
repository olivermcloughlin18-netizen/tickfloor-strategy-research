// Broad US dollar index regime -> rotate into domestic-revenue sectors when the dollar is
// strengthening (3-month-lag comparison), export-exposed sectors when it is weakening.
// Source: Jorion 1990 J. Business (exchange-rate exposure of US multinationals); Bartov & Bodnar
// 1994 JF; S&P Dow Jones Indices "S&P 500 Global Sales" (technology, materials and energy earn
// the largest foreign shares; utilities, real estate and financials the smallest). Weak prior.

export const meta = {
  id: "r27-sector-dollar-domestic",
  name: "Domestic sectors when the dollar strengthens, exporters when it weakens",
  family: "macro",
  source: "Jorion 1990 J. Business (exchange-rate exposure of US multinationals); Bartov & Bodnar 1994 JF; S&P Dow Jones Indices 'S&P 500 Global Sales' (technology, materials and energy earn the largest foreign shares; utilities, real estate and financials the smallest). Weak prior.",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "XLC", "VNQ"],
  rebalance: "monthly",
  params: { lagMonths: 3 },
};

const ALL = ["XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "XLC", "VNQ"];
const DOMESTIC = ["XLU", "VNQ", "XLF"];
const EXPORTY = ["XLK", "XLB", "XLE"];

function ewPresent(universe) {
  const present = ALL.filter((s) => universe[s]);
  const w = {};
  for (const s of present) w[s] = 1 / present.length;
  return w;
}

function ewSubset(universe, names) {
  const present = names.filter((s) => universe[s]);
  if (present.length === 0) return ewPresent(universe);
  const w = {};
  for (const s of present) w[s] = 1 / present.length;
  return w;
}

// ctx.state.D persists the DTWEXBGS series across rebalance calls within one run.
export function rank(universe, t, ctx) {
  if (ctx.state.D === undefined) ctx.state.D = [];

  ctx.state.D.push(ctx.macro("DTWEXBGS"));

  const D = ctx.state.D;
  const lag = ctx.params.lagMonths;
  if (D.length < lag + 1) return ewPresent(universe);

  const last = D[D.length - 1];
  const lagged = D[D.length - 1 - lag];
  if (last === null || lagged === null) return ewPresent(universe);

  const strong = last > lagged;
  return strong ? ewSubset(universe, DOMESTIC) : ewSubset(universe, EXPORTY);
}
