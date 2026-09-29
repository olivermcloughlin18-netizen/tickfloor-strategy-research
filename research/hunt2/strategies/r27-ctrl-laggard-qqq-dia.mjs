// prereg-2026-09-27 dumb control: hold 100% of whichever of QQQ/DIA has the LOWER 21-session return
// (plain buy-after-a-drop at the same monthly cadence). Tie -> DIA.
export const meta = {
  id: "r27-ctrl-laggard-qqq-dia",
  name: "Control: 100% in the lower 21-session return of QQQ/DIA, monthly",
  family: "deep-validation-control",
  source: "Preregistered matched naive control (prereg-2026-09-27 section 6)",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "DIA"],
  rebalance: "monthly",
  params: { lag: 2, lookback: 21, need: 23 },
};

function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}

export function rank(universe, t, ctx) {
  const { lag, lookback, need } = ctx.params;
  const [a, b] = meta.assets;
  if (!universe[a] || !universe[b]) return ew(universe);
  if (universe[a].length < need || universe[b].length < need) return ew(universe);
  const R = (x) => { const e = x.length - lag; return x[e].close / x[e - lookback].close - 1; };
  const ra = R(universe[a]), rb = R(universe[b]);
  if (!Number.isFinite(ra) || !Number.isFinite(rb)) return ew(universe);
  if (ra === rb) return { DIA: 1 };
  return ra < rb ? { [a]: 1 } : { [b]: 1 };
}
