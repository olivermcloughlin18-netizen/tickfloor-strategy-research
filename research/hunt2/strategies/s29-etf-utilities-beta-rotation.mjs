export const meta = {
  id: "s29-etf-utilities-beta-rotation",
  name: "Utilities beta rotation (XLU vs market, 4 weeks)",
  family: "other",
  source: "Gayed & Bilello 2014 (Dow Award) 'An Intermarket Approach to Beta Rotation: The Strategy, Signal and Power of Utilities'",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLU", "DIA"],
  proxyFor: { SPY: "DIA" },
  rebalance: "weekly",
  longShort: false,
  params: { lookback: 20 },
};

export function rank(universe, t, ctx) {
  const n = ctx.params.lookback;
  const xlu = universe.XLU;
  const dia = universe.DIA;
  if (!xlu || !dia || xlu.length <= n || dia.length <= n) return {};

  const xluReturn = xlu[xlu.length - 1].close / xlu[xlu.length - 1 - n].close - 1;
  const diaReturn = dia[dia.length - 1].close / dia[dia.length - 1 - n].close - 1;
  return xluReturn > diaReturn ? { XLU: 1 } : { DIA: 1 };
}
