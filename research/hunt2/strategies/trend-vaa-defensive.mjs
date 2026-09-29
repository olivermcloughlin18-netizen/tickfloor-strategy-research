// Vigilant Asset Allocation (VAA)-style canary rotation: a single canary
// asset's blended momentum decides risk-on/risk-off; risk-on splits equally
// across the top-2 offensive ETFs by blended momentum, risk-off goes fully
// into the single best defensive (bond) ETF by blended momentum.
// SPY/EFA are holdout -> QQQ/VNQ used in the offensive/canary set instead.
export const meta = {
  id: "trend-vaa-defensive",
  name: "VAA canary defensive rotation",
  family: "trend-managed-futures",
  source: "Keller & Keuning 2017 (Vigilant Asset Allocation)",
  assetClass: "etf",
  timeframe: "1d",
  universe: "ETFS_DAILY",
  rebalance: "monthly",
  params: {
    offensive: ["QQQ", "DIA", "XLK", "VNQ"],
    canary: ["QQQ", "TLT"],
    defensive: ["IEF", "SHY", "AGG"],
    lookback: 126, // ~6 months, VAA's shortest blended leg alone (harness has no monthly-bar helper)
  },
};

function mom(bars) {
  if (bars.length < 127) return null;
  return bars.at(-1).close / bars.at(-127).close - 1;
}

export function rank(universe, t, ctx) {
  const { offensive, canary, defensive } = ctx.params;
  const score = (sym) => (universe[sym] ? mom(universe[sym]) : null);

  const canaryScores = canary.map(score);
  if (canaryScores.some((s) => s === null)) return {};
  const riskOff = canaryScores.some((s) => s < 0);

  if (riskOff) {
    let best = null, bestScore = -Infinity;
    for (const sym of defensive) {
      const s = score(sym);
      if (s !== null && s > bestScore) { bestScore = s; best = sym; }
    }
    return best ? { [best]: 1 } : {};
  }

  const scored = offensive.map((sym) => [sym, score(sym)]).filter(([, s]) => s !== null);
  scored.sort((a, b) => b[1] - a[1]);
  const top = scored.slice(0, 2);
  if (!top.length) return {};
  const w = {};
  for (const [sym] of top) w[sym] = 1 / top.length;
  return w;
}
