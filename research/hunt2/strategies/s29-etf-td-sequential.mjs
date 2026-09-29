export const meta = {
  id: "s29-etf-td-sequential",
  name: "TD Sequential setup-9 exhaustion",
  family: "mean_reversion",
  source: "DeMark 1994 'The New Science of Technical Analysis' (TD Sequential setup)",
  assetClass: "etf",
  timeframe: "1d",
  assets: [
    "QQQ", "DIA", "XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY",
    "XLU", "XLB", "XLC", "VNQ", "TLT", "IEF", "SHY", "LQD", "HYG",
    "AGG", "GLD", "SLV", "USO", "UNG", "DBC", "UUP",
  ],
  longShort: true,
  holdBars: 5,
  params: { cmp: 4, count: 9, holdBars: 5 },
};

export function signal(bars, i, ctx) {
  const { cmp, count } = ctx.params;
  if (ctx.state.buyCount === undefined) {
    ctx.state.buyCount = 0;
    ctx.state.sellCount = 0;
  }
  if (i < cmp) return 0;

  ctx.state.buyCount = bars[i].close < bars[i - cmp].close ? ctx.state.buyCount + 1 : 0;
  ctx.state.sellCount = bars[i].close > bars[i - cmp].close ? ctx.state.sellCount + 1 : 0;

  if (i < 13) return 0;
  if (ctx.state.buyCount === count) return 1;
  if (ctx.state.sellCount === count) return -1;
  return 0;
}
