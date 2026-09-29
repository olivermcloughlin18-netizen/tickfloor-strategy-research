// prereg C3 r27: weekly cross-sectional 21-session momentum with a buffer rule.
// A previously held name stays in if its current rank is still within the buffer
// zone B (= ceil(0.5*M)); only the gap to K = max(3, round(0.3*M)) is refilled with
// fresh top-ranked names. Cuts turnover/costs vs a hard top-K rebalance each week.
export const meta = {
  id: "r27-crypto-mom-buffer__rob1",
  name: "Crypto 3-week momentum with a 50% hold buffer (-25%)",
  family: "momentum",
  source: "u/VettaQ, r/CryptoMarkets 1wp3tyi (the cost objection / zero-fee rerun); Novy-Marx & Velikov 2016 RFS (buffer rules cut anomaly trading costs); Liu, Tsyvinski & Wu 2022 JF. Follow-up of r25-crypto-mom3w (p = 0.139); a new test.",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "weekly",
  params: { lag: 2, lookback: 16, need: 18, minNames: 8, frac: 0.3, bufferFrac: 0.5 },
};

function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}

function order(rows) {
  return rows.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

export function rank(universe, t, ctx) {
  const { lag, lookback, need, minNames, frac, bufferFrac } = ctx.params;
  if (ctx.state.H === undefined) ctx.state.H = [];

  const rows = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    const L = b.length;
    if (L < need) continue;
    const e = L - lag;
    const score = b[e].close / b[e - lookback].close - 1;
    if (Number.isFinite(score)) rows.push([sym, score]);
  }
  const M = rows.length;
  if (M < minNames) {
    ctx.state.H = [];
    return ew(universe);
  }

  const ranked = order(rows); // rank 1 = ranked[0]
  const rankOf = {};
  ranked.forEach(([sym], idx) => (rankOf[sym] = idx + 1));

  const K = Math.max(3, Math.round(frac * M));
  const B = Math.ceil(bufferFrac * M);

  let keep = ctx.state.H.filter((sym) => rankOf[sym] !== undefined && rankOf[sym] <= B);

  for (const [sym] of ranked) {
    if (keep.length >= K) break;
    if (!keep.includes(sym)) keep.push(sym);
  }

  if (keep.length > K) {
    keep = keep.sort((a, b) => rankOf[a] - rankOf[b]).slice(0, K);
  }

  ctx.state.H = keep;
  const out = {};
  for (const sym of keep) out[sym] = 1 / keep.length;
  return out;
}
