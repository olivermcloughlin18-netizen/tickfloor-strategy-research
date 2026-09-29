export const meta = {
  id: "volreg-xsrev-vix-low",
  name: "1-day cross-sectional reversal, active only in bottom-quintile VIX (matched control)",
  family: "volatility",
  source: "matched-frequency placebo regime for volreg-xsrev-vix-high",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_DAILY",
  rebalance: "daily",
  longShort: true,
  params: { decile: 0.2, jumpFilter: 0.15, vixWindow: 504, vixPct: 0.20 },
};

export function rank(universe, t, ctx) {
  const v = ctx.macro("VIX");
  let gateOn = false;
  if (ctx.state.vixHist === undefined) ctx.state.vixHist = [];
  const h = ctx.state.vixHist;
  if (v !== null && Number.isFinite(v) && h.length >= ctx.params.vixWindow) {
    const w = h.slice(h.length - ctx.params.vixWindow).sort((a, b) => a - b);
    const hi = w[Math.floor(Math.max(ctx.params.vixPct, 1 - ctx.params.vixPct) * (w.length - 1))];
    const lo = w[Math.floor(Math.min(ctx.params.vixPct, 1 - ctx.params.vixPct) * (w.length - 1))];
    gateOn = v <= lo;
  }
  if (v !== null && Number.isFinite(v)) h.push(v);

  if (gateOn) {
    const scores = [];
    for (const sym of Object.keys(universe)) {
      const b = universe[sym];
      if (b.length < 2) continue;
      const ret = b[b.length - 1].close / b[b.length - 2].close - 1;
      if (Math.abs(ret) > ctx.params.jumpFilter) continue;
      scores.push({ sym, ret });
    }
    if (scores.length < 10) return {};
    scores.sort((a, b) => a.ret - b.ret);
    const n = Math.max(1, Math.floor(scores.length * ctx.params.decile));
    const bottom = scores.slice(0, n);
    const top = scores.slice(-n);
    const w = {};
    for (const s of bottom) w[s.sym] = 0.5 / bottom.length;
    for (const s of top) w[s.sym] = -0.5 / top.length;
    return w;
  }

  const keys = Object.keys(universe);
  const w = {};
  for (const sym of keys) w[sym] = 1 / keys.length;
  return w;
}
