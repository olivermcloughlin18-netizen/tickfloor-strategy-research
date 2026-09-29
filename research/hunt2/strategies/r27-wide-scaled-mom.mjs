// 12-1 cross-sectional momentum over the wide US stock universe, phased in over
// up to 3 consecutive rebalances (Jegadeesh & Titman 1993 overlapping-holding-period
// idea) so a name's weight ramps 1/3 -> 2/3 -> 3/3 of its target the longer it stays
// in the top-N momentum bucket; leftover weight is spread equally across all
// eligible names so the portfolio always sums to 1.
export const meta = {
  id: "r27-wide-scaled-mom",
  name: "12-1 momentum scaled in over three months (wide US stocks)",
  family: "momentum",
  source:
    "u/IndependentCause9435, r/ASX_Bets 1wo5lrs (split an entry into smaller pieces); Jegadeesh & Titman 1993 JF (overlapping holding periods phase positions in); Novy-Marx & Velikov 2016 RFS",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { lag: 2, need: 254, steps: 3 },
};

function ewPresent(universe) {
  const names = Object.keys(universe);
  const w = {};
  for (const sym of names) w[sym] = 1 / names.length;
  return w;
}

export function rank(universe, t, ctx) {
  const { lag, need, steps } = ctx.params;
  if (ctx.state.step === undefined) ctx.state.step = {};
  const stepMap = ctx.state.step;

  const names = Object.keys(universe);

  // 12-1 momentum = close[e-21] / close[e-252] - 1, e = last usable bar (L - lag).
  const eligible = [];
  for (const sym of names) {
    const b = universe[sym];
    const L = b.length;
    if (L < need) continue;
    const e = L - lag;
    const iSkip = e - 21;
    const iLook = e - 252;
    if (iLook < 0) continue;
    const cSkip = b[iSkip].close;
    const cLook = b[iLook].close;
    if (!Number.isFinite(cSkip) || !Number.isFinite(cLook) || cLook === 0) continue;
    const score = cSkip / cLook - 1;
    if (!Number.isFinite(score)) continue;
    eligible.push({ sym, score });
  }

  const M = eligible.length;
  if (M < 50) {
    for (const key of Object.keys(stepMap)) delete stepMap[key];
    return ewPresent(universe);
  }

  const N = Math.max(10, Math.round(0.2 * M));
  eligible.sort((a, b) => b.score - a.score || (a.sym < b.sym ? -1 : a.sym > b.sym ? 1 : 0));
  const T = new Set(eligible.slice(0, N).map((x) => x.sym));

  // Update the phase-in step for every name currently trading: in T it climbs
  // toward `steps`, everyone else resets so re-entering starts the ramp over.
  for (const sym of names) {
    const prev = stepMap[sym] === undefined ? 0 : stepMap[sym];
    stepMap[sym] = T.has(sym) ? Math.min(steps, prev + 1) : 0;
  }

  let sumRaw = 0;
  const raw = {};
  for (const { sym } of eligible) {
    const s = stepMap[sym] === undefined ? 0 : stepMap[sym];
    const r = s > 0 ? s / steps / N : 0;
    raw[sym] = r;
    sumRaw += r;
  }

  const residual = (1 - sumRaw) / M;
  const w = {};
  for (const { sym } of eligible) w[sym] = raw[sym] + residual;
  return w;
}
