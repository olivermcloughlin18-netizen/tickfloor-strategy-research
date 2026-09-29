export const meta = {
  id: "s29-etf-macro-quadrant",
  name: "Real-yield x breakeven quadrant allocation",
  family: "other",
  source: "Ilmanen 2011 'Expected Returns' (growth/inflation regimes); Bridgewater All Weather regime mapping",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["GLD", "DBC", "TLT", "QQQ", "XLE", "XLF", "SHY", "UUP"],
  longShort: false,
  rebalance: "monthly",
  params: { lagRebalances: 3 },
};

export function rank(universe, t, ctx) {
  if (ctx.state.realYields === undefined) ctx.state.realYields = [];
  if (ctx.state.breakevens === undefined) ctx.state.breakevens = [];

  const realYield = ctx.macro("DFII10");
  const breakeven = ctx.macro("T10YIE");
  ctx.state.realYields.push(realYield);
  ctx.state.breakevens.push(breakeven);

  const pastIndex = ctx.state.realYields.length - 1 - ctx.params.lagRebalances;
  if (
    pastIndex < 0 ||
    realYield === null ||
    breakeven === null ||
    ctx.state.realYields[pastIndex] === null ||
    ctx.state.breakevens[pastIndex] === null
  ) return universe.SHY ? { SHY: 1 } : {};

  const dR = realYield - ctx.state.realYields[pastIndex];
  const dB = breakeven - ctx.state.breakevens[pastIndex];
  if (dR < 0) return dB > 0 ? (universe.DBC ? { GLD: 0.5, DBC: 0.5 } : {}) : (universe.TLT ? { TLT: 0.5, QQQ: 0.5 } : {});
  return dB > 0 ? (universe.XLE ? { XLE: 0.5, XLF: 0.5 } : {}) : (universe.SHY ? { SHY: 0.5, UUP: 0.5 } : {});
}
