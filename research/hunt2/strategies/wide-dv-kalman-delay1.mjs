export const meta = {
  id: "wide-dv-kalman-delay1",
  name: "Kalman trend filter, 1-bar delayed fill (wide US stocks)",
  family: "deep-validation-execution",
  source: "deep-validation.md (pre-registered execution check of mlq-kalman-trend-filter)",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",
  params: { q: 1e-5, r: 1e-3 },
};
function kalman(bars, i, ctx) {
  const s = ctx.state;
  if (i === 0) { s.level = bars[0].close; s.slope = 0; s.p00 = 1; s.p01 = 0; s.p10 = 0; s.p11 = 1; return 0; }
  const q = ctx.params.q, r = ctx.params.r, z = bars[i].close;
  const lp = s.level + s.slope, sp = s.slope;
  const a = s.p00 + 2 * s.p01 + s.p11 + q, b = s.p01 + s.p11, c = s.p01 + s.p11, d = s.p11 + q;
  const y = z - lp, S = a + r, K0 = a / S, K1 = c / S;
  s.level = lp + K0 * y; s.slope = sp + K1 * y;
  s.p00 = (1 - K0) * a - K0 * c; s.p01 = (1 - K0) * b - K0 * d; s.p10 = -K1 * a + (1 - K1) * c; s.p11 = -K1 * b + (1 - K1) * d;
  return s.slope > 0 && z > s.level ? 1 : 0;
}
export function signal(bars, i, ctx) { const raw = kalman(bars, i, ctx); const out = ctx.state.prev ?? 0; ctx.state.prev = raw; return out; }
