export const meta = {
  id: "s29-etf-gold-realyield-fairvalue",
  name: "Precious metals below their real-yield fair value",
  family: "mean_reversion",
  source: "Erb & Harvey 2013 FAJ ('The golden dilemma': gold vs real yields)",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["GLD", "SLV"],
  longShort: false,
  params: { window: 252, entryZ: -1.5, exitZ: 0 },
};

export function signal(bars, i, ctx) {
  if (ctx.state.pos === undefined) ctx.state.pos = 0;
  const n = ctx.params.window;
  if (i < n) return ctx.state.pos;

  const start = i - n + 1;
  let sumX = 0;
  let sumY = 0;
  for (let k = start; k <= i; k++) {
    const x = ctx.macro("DFII10", k);
    if (x === null) return ctx.state.pos;
    sumX += x;
    sumY += Math.log(bars[k].close);
  }

  const meanX = sumX / n;
  const meanY = sumY / n;
  let sxx = 0;
  let sxy = 0;
  for (let k = start; k <= i; k++) {
    const dx = ctx.macro("DFII10", k) - meanX;
    sxx += dx * dx;
    sxy += dx * (Math.log(bars[k].close) - meanY);
  }
  if (sxx === 0) return ctx.state.pos;

  const b = sxy / sxx;
  const a = meanY - b * meanX;
  let sumResidual = 0;
  let sumResidualSq = 0;
  let currentResidual = 0;
  for (let k = start; k <= i; k++) {
    const residual = Math.log(bars[k].close) - a - b * ctx.macro("DFII10", k);
    sumResidual += residual;
    sumResidualSq += residual * residual;
    if (k === i) currentResidual = residual;
  }

  const variance = (sumResidualSq - sumResidual * sumResidual / n) / (n - 1);
  if (!(variance > 0)) return ctx.state.pos;
  const z = currentResidual / Math.sqrt(variance);
  if (ctx.state.pos === 0 && z <= ctx.params.entryZ) ctx.state.pos = 1;
  else if (ctx.state.pos === 1 && z >= ctx.params.exitZ) ctx.state.pos = 0;
  return ctx.state.pos;
}
