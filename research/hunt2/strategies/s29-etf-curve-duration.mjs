export const meta = {
  id: "s29-etf-curve-duration",
  name: "Treasury duration chosen by the 2s10s slope level",
  family: "carry",
  source: "Fama & Bliss 1987 AER (forward spreads predict bond returns); Campbell & Shiller 1991 RES",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["TLT", "IEF", "SHY"],
  longShort: false,
  rebalance: "monthly",
  params: { steep: 1, flat: 0 },
};

export function rank(universe, t, ctx) {
  const slope = ctx.macro("T10Y2Y");
  if (slope === null || slope <= ctx.params.steep && slope > ctx.params.flat) return { IEF: 1 };
  return slope > ctx.params.steep ? { TLT: 1 } : { SHY: 1 };
}
