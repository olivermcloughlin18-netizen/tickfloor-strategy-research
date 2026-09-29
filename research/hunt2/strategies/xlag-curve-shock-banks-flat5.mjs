// HYPOTHESIS: a 2-sigma 5-day FLATTENING of the US 10y-2y Treasury slope is not fully impounded
// in bank equity prices on the day it happens, so the next 5 sessions carry continued bank
// underperformance -- i.e. the rates curve leads bank stocks by 1-5 days.
// Mechanism: the slope is the direct input to depository net interest margin; the argument is
// gradual information diffusion (Hong-Stein), not a level/regime filter.
// Distinct from catalogue macro-yield-curve-2s10s-inversion-timing (2s10s LEVEL / inversion regime
// timing broad equity) and from macro-realyield-duration-leadlag (DFII10 beta-ranked SECTOR
// rotation): this is a short-horizon slope SHOCK timing a single mechanically-exposed industry.
// Matched naive control: xlag-ctrl-banks-own-drop-flat5 (identical in every respect except the
// driver is the bank's own 5-day return).
export const meta = {
  id: "xlag-curve-shock-banks-flat5",
  name: "2s10s flattening shock leads bank stocks by 1-5 days",
  family: "macro-intermarket",
  source: "Cross-asset lead-lag / gradual information diffusion (Hong & Stein 1999) applied to the curve-slope -> bank NIM channel; FRED T10Y2Y.",
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

  // driver: LOOKBACK-day change in the 10y-2y slope, both ends known by their own bar's close
  let x = NaN;
  if (i >= p.LOOKBACK) {
    const now = ctx.macro("T10Y2Y", i);
    const past = ctx.macro("T10Y2Y", i - p.LOOKBACK);
    if (now !== null && past !== null) x = now - past;
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
