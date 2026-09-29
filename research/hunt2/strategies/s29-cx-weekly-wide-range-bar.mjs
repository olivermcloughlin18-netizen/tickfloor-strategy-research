export const meta = {
  id: "s29-cx-weekly-wide-range-bar",
  name: "Weekly wide-range bar closing near its high",
  family: "trend",
  source: "Crabel 1990 'Day Trading with Short Term Price Patterns and Opening Range Breakout' (range expansion); Larry Williams 1999 (wide-range bars)",
  assetClass: "crypto",
  timeframe: "1d",
  assets: ["BTCUSDT","BNBUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","LTCUSDT","LINKUSDT","TRXUSDT","BCHUSDT","ATOMUSDT","ETCUSDT","DASHUSDT","ZECUSDT","AVAXUSDT","UNIUSDT","NEARUSDT","AAVEUSDT","HBARUSDT"],
  params: { rangeMult: 1.5, prevWeeks: 8, closeLoc: 0.75, holdBars: 7 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (ctx.state.rem === undefined) { ctx.state.rem = 0; ctx.state.nw = 0; }
  const W = ctx.resample(bars, "1w").filter((w) => w.complete);
  const increased = W.length > ctx.state.nw;
  ctx.state.nw = W.length;
  if (ctx.state.rem > 0) { ctx.state.rem--; return 1; }
  if (!increased || W.length < p.prevWeeks + 1) return 0;
  const w = W[W.length - 1];
  let s = 0;
  for (let k = W.length - 1 - p.prevWeeks; k < W.length - 1; k++) s += W[k].high - W[k].low;
  const range = w.high - w.low;
  if (range >= p.rangeMult * (s / p.prevWeeks) && range > 0 && (w.close - w.low) / range >= p.closeLoc) {
    ctx.state.rem = p.holdBars - 1;
    return 1;
  }
  return 0;
}
