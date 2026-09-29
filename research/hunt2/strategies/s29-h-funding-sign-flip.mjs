export const meta = {
  id: "s29-h-funding-sign-flip",
  name: "Trade in the direction of a perp funding sign flip",
  family: "momentum",
  source: "He, Manela, Ross & von Wachter 2022; Kaiko research on funding regime shifts",
  assetClass: "crypto",
  timeframe: "1h",
  assets: ["BTCUSDT","BNBUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","LTCUSDT","LINKUSDT","TRXUSDT"],
  longShort: true,
  params: { minAbs: 0.00005, holdBars: 24 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (ctx.state.left === undefined) { ctx.state.left = 0; ctx.state.dir = 0; }
  if (ctx.state.left > 0) { ctx.state.left--; return ctx.state.dir; }
  if (i < 1) return 0;
  const a = ctx.fundingRate(i), b = ctx.fundingRate(i - 1);
  if (a === null || b === null || a === 0 || b === 0) return 0;
  if (Math.sign(a) === Math.sign(b) || Math.abs(a) < p.minAbs) return 0;
  ctx.state.dir = a > 0 ? 1 : -1;
  ctx.state.left = p.holdBars - 1;
  return ctx.state.dir;
}
