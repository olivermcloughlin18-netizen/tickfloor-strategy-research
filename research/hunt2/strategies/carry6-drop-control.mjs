// MATCHED NAIVE CONTROL for carry6-funding-residual.
// Same universe, same eligibility gate (funding known + 180-bar window full),
// same firing rate (bottom 10th percentile of a trailing-180 distribution),
// same holdBars, same costs, same benchmark.
// The ONLY difference: this ranks the raw trailing 3-day return (buy-after-a-drop),
// where the strategy ranks funding residualised on that same 3-day return.
export const meta = {
  id: "carry6-drop-control",
  name: "Buy-after-a-drop matched control (3d return decile, funding-gated sample)",
  family: "carry",
  source: "Matched naive control for the funding-residual hypothesis; the buy-after-a-drop twin that already killed the funding bounce",
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

  const rNow = st.r[n - 1];
  let le = 0;
  for (let k = 0; k < n; k++) if (st.r[k] <= rNow) le++;
  return (le / n) * 100 <= p.pctCut ? 1 : 0;
}
