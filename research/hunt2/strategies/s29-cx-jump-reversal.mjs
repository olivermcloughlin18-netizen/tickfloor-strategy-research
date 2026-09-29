export const meta = {
  id: "s29-cx-jump-reversal",
  name: "Bipower-detected daily price jumps fade over three days",
  family: "mean_reversion",
  source: "Barndorff-Nielsen & Shephard 2004 J. Fin. Econometrics (bipower variation jump test); Scaillet, Treccani & Trevisan 2020 J. Fin. Econometrics (high-frequency jumps in Bitcoin)",
  assetClass: "crypto",
  timeframe: "1d",
  assets: ["BTCUSDT","BNBUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","LTCUSDT","LINKUSDT","TRXUSDT","BCHUSDT","ATOMUSDT","ETCUSDT","DASHUSDT","ZECUSDT","AVAXUSDT","UNIUSDT","NEARUSDT","AAVEUSDT","HBARUSDT"],
  longShort: true,
  params: { window: 60, k: 4, holdBars: 3 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (ctx.state.left === undefined) { ctx.state.left = 0; ctx.state.dir = 0; }
  if (ctx.state.left > 0) { ctx.state.left--; return ctx.state.dir; }
  if (i < p.window + 2) return 0;
  const l = (k) => Math.log(bars[k].close / bars[k - 1].close);
  let s = 0;
  for (let k = i - p.window; k <= i - 1; k++) s += Math.abs(l(k)) * Math.abs(l(k - 1));
  const bv = (Math.PI / 2) * (s / p.window);
  const li = l(i);
  if (!(Math.abs(li) > p.k * Math.sqrt(bv))) return 0;
  ctx.state.dir = li > 0 ? -1 : 1;
  ctx.state.left = p.holdBars - 1;
  return ctx.state.dir;
}
