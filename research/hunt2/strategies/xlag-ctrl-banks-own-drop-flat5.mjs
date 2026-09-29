// MATCHED NAIVE CONTROL for xlag-curve-shock-banks-flat5, written and run FIRST.
// Identical mechanism (default long a fixed bank basket; sit out the next 5 sessions after a
// 2-sigma 5-day DOWN shock in the driver), identical assets, frequency, costs and benchmark.
// The ONLY difference is the driver: here the shock is the bank's OWN trailing 5-day return,
// there it is the 5-day change in the 10y-2y Treasury slope. If the curve version cannot beat
// this, the "cross-asset lead" is just price autocorrelation.
export const meta = {
  id: "xlag-ctrl-banks-own-drop-flat5",
  name: "Control: sit out 5 sessions after a bank's own 2-sigma 5-day drop",
  family: "macro-intermarket",
  source: "Matched naive control (same frequency, mechanism, costs, benchmark) for the curve-slope lead-lag test in this lane.",
  assetClass: "us_stock",
  timeframe: "1d",
  assets: ["JPM", "BAC", "WFC", "C", "SCHW", "STT", "RF", "ZION", "WAL", "UMBF"],
  params: { LOOKBACK: 5, HOLD: 5, WIN: 250, SIGMA: 2.0 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (ctx.state.flat === undefined) {
    ctx.state.flat = 0;
    ctx.state.w = ctx.rolling(p.WIN);
  }
  const w = ctx.state.w;

  // driver: own trailing LOOKBACK-day return, known at the close of bar i
  let x = NaN;
  if (i >= p.LOOKBACK) {
    const prev = bars[i - p.LOOKBACK].close;
    if (prev > 0) x = bars[i].close / prev - 1;
  }

  let trig = false;
  if (Number.isFinite(x)) {
    if (w.full()) {
      const s = w.std();
      if (s > 0 && x < w.mean() - p.SIGMA * s) trig = true; // threshold uses PAST window only
    }
    w.push(x);
  }

  if (trig) ctx.state.flat = p.HOLD;
  if (ctx.state.flat > 0) { ctx.state.flat--; return 0; }
  return 1;
}
