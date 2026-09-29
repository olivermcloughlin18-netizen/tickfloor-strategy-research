// prereg-2026-09-25 B4: volatility-managed equity weight, remainder in bonds (never cash).
// Equity weight = min(1, 0.04 / annualised 21-session variance of equity returns), i.e. a 20%
// volatility target; the rest goes to the bond ETF.
export const meta = {
  id: "r25-qqq-agg-volmanaged__rob2",
  name: "Volatility-managed QQQ with the remainder in AGG (2005+) (+25%)",
  family: "volatility",
  source: "Moreira & Muir 2017 JF (volatility-managed portfolios)",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "AGG"],
  rebalance: "monthly",
  params: { need: 28, lag: 2, window: 26, targetVar: 0.04 },
};

const EQUITY = new Set(["QQQ", "IWM"]);
function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}

export function rank(universe, t, ctx) {
  const { need, lag, window, targetVar } = ctx.params;
  const syms = Object.keys(universe);
  const eq = syms.find((s) => EQUITY.has(s));
  const bd = syms.find((s) => !EQUITY.has(s));
  if (syms.length !== 2 || !eq || !bd) return ew(universe);
  const b = universe[eq];
  if (b.length < need) return ew(universe);
  const e = b.length - lag;
  const r = [];
  for (let k = e - window + 1; k <= e; k++) r.push(b[k].close / b[k - 1].close - 1);
  const m = r.reduce((p, q) => p + q, 0) / r.length;
  const v = (r.reduce((p, q) => p + (q - m) ** 2, 0) / (r.length - 1)) * 252;
  if (!Number.isFinite(v)) return ew(universe);
  const w = v > 0 ? Math.min(1, targetVar / v) : 1;
  return { [eq]: w, [bd]: 1 - w };
}
