export const meta = {
  id: "s29-etf-vrp-timing",
  name: "Equity ETFs held while the variance risk premium is positive",
  family: "volatility",
  source: "Bollerslev, Tauchen & Zhou 2009 RFS ('Expected stock returns and variance risk premia')",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "DIA", "XLK", "XLF", "XLI", "XLY"],
  params: { rvWindow: 21, enter: 4, exit: 0 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (ctx.state.pos === undefined) ctx.state.pos = 0;
  if (i < 22) return 0;
  const vix = ctx.macro("VIX", i);
  if (vix === null || vix === undefined) return ctx.state.pos;
  const rv = 100 * Math.sqrt(252) * ctx.rollingStd("ret", p.rvWindow, i);
  if (!(rv >= 0)) return ctx.state.pos;
  const vrp = vix - rv;
  if (ctx.state.pos === 0 && vrp >= p.enter) ctx.state.pos = 1;
  else if (ctx.state.pos === 1 && vrp < p.exit) ctx.state.pos = 0;
  return ctx.state.pos;
}
