// HYPOTHESIS: perpetual funding carries information about forward spot returns that is
// ORTHOGONAL to the recent price drop it coincides with.
//
// The funding bounce already died to a plain buy-after-a-drop control, because extreme
// negative funding IS a price drop restated. This isolates the part that is not:
// regress funding on the trailing 3-day return over a trailing 180-bar window, take the
// residual, and long the bottom decile of that residual's own trailing distribution.
// Mechanism the catalogued funding rules do not have: return-orthogonalisation.
//
// Matched control: carry6-drop-control.mjs (identical in every respect except that it
// ranks the raw 3-day return instead of the residual).
//
// NaN safety: no running sums. Only finite values enter the buffers, and every mean is a
// fresh explicit loop over the buffer, so one warm-up NaN cannot poison later bars.
export const meta = {
  id: "carry6-funding-residual",
  name: "Return-orthogonalised funding residual, bottom decile",
  family: "carry",
  source: "Own hypothesis: the residual of perp funding after removing its trailing-return component",
  assetClass: "crypto",
  timeframe: "1d",
  holdBars: 5,
  params: { window: 180, lookback: 3, pctCut: 10 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  const st = ctx.state;
  if (st.f === undefined) { st.f = []; st.r = []; }

  if (i < p.lookback) return 0;
  const f = ctx.fundingRate();
  if (f === null || !Number.isFinite(f)) return 0;
  const prev = bars[i - p.lookback].close;
  if (!(prev > 0)) return 0;
  const r = bars[i].close / prev - 1;
  if (!Number.isFinite(r)) return 0;

  st.f.push(f); st.r.push(r);
  if (st.f.length > p.window) { st.f.shift(); st.r.shift(); }
  const n = st.f.length;
  if (n < p.window) return 0;

  // OLS of f on r over the window, computed by explicit loops (no running sums).
  let sf = 0, sr = 0;
  for (let k = 0; k < n; k++) { sf += st.f[k]; sr += st.r[k]; }
  const mf = sf / n, mr = sr / n;
  let cov = 0, varR = 0;
  for (let k = 0; k < n; k++) {
    const dr = st.r[k] - mr;
    cov += dr * (st.f[k] - mf);
    varR += dr * dr;
  }
  const beta = varR > 0 ? cov / varR : 0;

  // residual of the current bar, ranked against the residuals of the whole window
  const eNow = st.f[n - 1] - (mf + beta * (st.r[n - 1] - mr));
  let le = 0;
  for (let k = 0; k < n; k++) {
    const e = st.f[k] - (mf + beta * (st.r[k] - mr));
    if (e <= eNow) le++;
  }
  return (le / n) * 100 <= p.pctCut ? 1 : 0;
}
