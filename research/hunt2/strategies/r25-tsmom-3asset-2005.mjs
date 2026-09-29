// prereg-2026-09-25 B4: three-sleeve time-series momentum, never cash. Each of the two risky
// assets holds 1/3 if its 252-session return is positive, otherwise its 1/3 moves to the bond.
export const meta = {
  id: "r25-tsmom-3asset-2005",
  name: "Time-series momentum QQQ/GLD with AGG as the safe sleeve (2005+)",
  family: "trend",
  source: "Moskowitz, Ooi & Pedersen 2012 JFE; Hurst, Ooi & Pedersen 2017 (a century of evidence on trend-following); Faber 2007",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "GLD", "AGG"],
  rebalance: "monthly",
  params: { need: 254, lag: 2, lookback: 252 },
};

const SAFE = new Set(["AGG", "BND"]);
function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}

export function rank(universe, t, ctx) {
  const { need, lag, lookback } = ctx.params;
  const syms = Object.keys(universe);
  const safe = syms.find((s) => SAFE.has(s));
  const risky = syms.filter((s) => !SAFE.has(s));
  if (syms.length !== 3 || !safe || risky.length !== 2) return ew(universe);
  const out = { [safe]: 1 / 3 };
  for (const s of risky) {
    const b = universe[s];
    if (b.length < need) return ew(universe);
    const r = b[b.length - lag].close / b[b.length - lag - lookback].close - 1;
    if (!Number.isFinite(r)) return ew(universe);
    if (r > 0) out[s] = 1 / 3;
    else out[safe] += 1 / 3;
  }
  return out;
}
