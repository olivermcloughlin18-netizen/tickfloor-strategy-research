// prereg-2026-09-25 B4: dual momentum between one equity index ETF and one bond ETF, never cash.
// Hold 100% equity if its 252-session return beats the bond's and is above 0, else 100% bond.
// Roles come from the EQUITY set so the same file runs unmodified on the holdout pair (IWM/BND).
export const meta = {
  id: "r25-qqq-agg-dualmom__rob2",
  name: "Dual momentum QQQ/AGG, bond instead of cash (2005+) (+25%)",
  family: "trend",
  source: "Antonacci 2014 (dual momentum); Moskowitz, Ooi & Pedersen 2012 JFE",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "AGG"],
  rebalance: "monthly",
  params: { need: 317, lag: 2, lookback: 315 },
};

const EQUITY = new Set(["QQQ", "IWM"]);
function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}

export function rank(universe, t, ctx) {
  const { need, lag, lookback } = ctx.params;
  const syms = Object.keys(universe);
  const eq = syms.find((s) => EQUITY.has(s));
  const bd = syms.find((s) => !EQUITY.has(s));
  if (syms.length !== 2 || !eq || !bd) return ew(universe);
  const ret = (b) => (b.length < need ? NaN : b[b.length - lag].close / b[b.length - lag - lookback].close - 1);
  const re = ret(universe[eq]);
  const rb = ret(universe[bd]);
  if (!Number.isFinite(re) || !Number.isFinite(rb)) return ew(universe);
  return re > rb && re > 0 ? { [eq]: 1 } : { [bd]: 1 };
}
