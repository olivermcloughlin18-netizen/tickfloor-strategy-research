// Lane sonnet-8, leg L0: MATCHED CONTROL for the trend gate.
// Equal weight over every eligible ETF, monthly, gross exposure 1.
// Same universe, same rebalance frequency, same eligibility filter, same costs,
// same benchmark as the gated legs. The ONLY difference is that there is no gate.
export const meta = {
  id: "tvs8-ew-gate200-etf",
  name: "Equal weight among names above the 200d SMA, renormalised to full exposure (ETF monthly) - L2 timing only",
  family: "trend",
  source: "sonnet-8 timing-vs-sizing decomposition; gate leg, control = tvs8-ew-all-etf",
  assetClass: "etf",
  timeframe: "1d",
  universe: "ETFS_DAILY",
  rebalance: "monthly",
  params: { trendWindow: 200, volWindow: 60, minBars: 201 },
};

// Eligibility is identical in all four legs: >= minBars history and a finite positive
// 60-day return volatility, so the four portfolios always choose from the same names.
function eligible(universe, ctx) {
  const out = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    const n = b.length;
    if (n < ctx.params.minBars) continue;

    let closeSum = 0;
    for (let k = n - ctx.params.trendWindow; k < n; k++) closeSum += b[k].close;
    const trendOK = b[n - 1].close > closeSum / ctx.params.trendWindow;

    const m = ctx.params.volWindow;
    let retSum = 0;
    for (let k = n - m; k < n; k++) retSum += b[k].close / b[k - 1].close - 1;
    const retMean = retSum / m;
    let sq = 0;
    for (let k = n - m; k < n; k++) {
      const d = b[k].close / b[k - 1].close - 1 - retMean;
      sq += d * d;
    }
    const vol = Math.sqrt(sq / (m - 1));
    if (!Number.isFinite(vol) || vol <= 0) continue;

    out.push({ sym, trendOK, invVol: 1 / vol });
  }
  return out;
}

export function rank(universe, t, ctx) {
  const el = eligible(universe, ctx).filter((e) => e.trendOK);
  const w = {};
  if (!el.length) return w;
  // Renormalised to gross 1: the gate REALLOCATES, it never moves money to cash.
  for (const e of el) w[e.sym] = 1 / el.length;
  return w;
}
