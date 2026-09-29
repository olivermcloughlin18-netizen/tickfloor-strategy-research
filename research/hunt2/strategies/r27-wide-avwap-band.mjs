// Stretched below the 21-session anchored-VWAP band (wide US stocks), weekly.
export const meta = {
  id: "r27-wide-avwap-band",
  name: "Stretched below the 21-session VWAP band (wide US stocks)",
  family: "mean_reversion",
  source: "u/Square-Middle-4474, r/Trading 1wop3th (anchored VWAP with standard-deviation bands, used with skill); Berkowitz, Logue & Noser 1988 JF (VWAP); Lehmann 1990. A discretionary anchor can't be tested, so the anchor is fixed 21 sessions back.",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "weekly",
  params: { lag: 2, anchorSessions: 21, need: 23 },
};

function ewPresent(universe) {
  const keys = Object.keys(universe);
  const w = {};
  for (const sym of keys) w[sym] = 1 / keys.length;
  return w;
}

export function rank(universe, t, ctx) {
  const { lag, anchorSessions, need } = ctx.params;
  const rows = []; // { sym, z }

  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    const L = b.length;
    if (L < need) continue;
    const e = L - lag;

    let V = 0;
    const tp = new Float64Array(anchorSessions);
    const vol = new Float64Array(anchorSessions);
    let ok = true;
    for (let j = 0; j < anchorSessions; j++) {
      const k = e - anchorSessions + 1 + j;
      const bar = b[k];
      const t_k = (bar.high + bar.low + bar.close) / 3;
      const v_k = bar.volume;
      if (!Number.isFinite(t_k) || !Number.isFinite(v_k)) { ok = false; break; }
      tp[j] = t_k;
      vol[j] = v_k;
      V += v_k;
    }
    if (!ok || !(V > 0)) continue;

    const vwap = (() => { let s = 0; for (let j = 0; j < anchorSessions; j++) s += tp[j] * vol[j]; return s / V; })();
    if (!Number.isFinite(vwap)) continue;

    let ss = 0;
    for (let j = 0; j < anchorSessions; j++) { const d = tp[j] - vwap; ss += vol[j] * d * d; }
    const sd = Math.sqrt(ss / V);
    if (!(sd > 0)) continue;

    const close = b[e].close;
    if (!Number.isFinite(close)) continue;
    const z = (close - vwap) / sd;
    if (!Number.isFinite(z)) continue;

    rows.push({ sym, z });
  }

  const M = rows.length;
  if (M < 50) return ewPresent(universe);
  const N = Math.max(10, Math.round(0.2 * M));

  rows.sort((a, b) => a.z - b.z || (a.sym < b.sym ? -1 : a.sym > b.sym ? 1 : 0));
  const winners = rows.slice(0, Math.min(N, rows.length));

  const w = {};
  const wt = 1 / winners.length;
  for (const r of winners) w[r.sym] = wt;
  return w;
}
