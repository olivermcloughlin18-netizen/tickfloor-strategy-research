export const meta = {
  id: "s29-etf-fng-momentum-tech",
  name: "Crypto sentiment surge spills into tech and discretionary ETFs",
  family: "sentiment",
  source: "Baker & Wurgler 2006 (speculative assets most sentiment-sensitive); Corbet, Meegan, Larkin, Lucey & Yarovaya 2018 Econ. Letters (crypto-asset spillovers); alternative.me F&G",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "XLK", "XLY", "XLC"],
  longShort: false,
  params: { lag: 5, jump: 15, holdBars: 5 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (ctx.state.left === undefined) ctx.state.left = 0;
  if (ctx.state.left > 0) {
    ctx.state.left--;
    return 1;
  }
  const current = ctx.macro("FNG", i) ?? 0;
  const prior = i >= p.lag ? ctx.macro("FNG", i - p.lag) ?? 0 : 0;
  if (current - prior < p.jump) return 0;
  ctx.state.left = p.holdBars - 1;
  return 1;
}
