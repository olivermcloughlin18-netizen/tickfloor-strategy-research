export const meta = {
  id: "s29-cx-fng-vix-idio-fear",
  name: "Crypto-specific fear while US equity volatility is calm",
  family: "sentiment",
  source: "Baker & Wurgler 2006; Da, Engelberg & Gao 2015 RFS; alternative.me F&G",
  assetClass: "crypto",
  timeframe: "1d",
  params: { fearMax: 30, vixMax: 18, holdBars: 14 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (ctx.state.left === undefined) ctx.state.left = 0;
  if (ctx.state.left > 0) { ctx.state.left--; return 1; }
  const f = ctx.macro("FNG", i), v = ctx.macro("VIX", i);
  if (f === null || v === null) return 0;
  if (f <= p.fearMax && v <= p.vixMax) { ctx.state.left = p.holdBars - 1; return 1; }
  return 0;
}
