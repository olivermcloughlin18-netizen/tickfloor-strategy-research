// prereg-2026-09-27 dumb control for r27-etf20-xsmom: EW over the 5 of 20 ETFs with the LOWEST
// 21-session return, monthly.
export const meta = {
  id: "r27-ctrl-drop-etf20",
  name: "Control: bottom 5 of 20 ETFs by 21-session return, monthly",
  family: "deep-validation-control",
  source: "Preregistered matched naive control (prereg-2026-09-27 section 6)",
  assetClass: "etf",
  timeframe: "1d",
  assets: [
    "QQQ", "DIA", "XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU",
    "XLB", "XLC", "VNQ", "TLT", "IEF", "LQD", "HYG", "AGG", "GLD", "SLV",
  ],
  rebalance: "monthly",
  params: { lag: 2, lookback: 21, need: 23, top: 5, minNames: 10 },
};

export function rank(universe, t, ctx) {
  const { lag, lookback, need, top, minNames } = ctx.params;
  const names = Object.keys(universe).sort();
  const scored = [];
  for (const sym of names) {
    const b = universe[sym];
    if (b.length < need) continue;
    const e = b.length - lag;
    const r = b[e].close / b[e - lookback].close - 1;
    if (Number.isFinite(r)) scored.push({ sym, r });
  }
  if (scored.length < minNames) {
    const ew = {};
    for (const sym of names) ew[sym] = 1 / names.length;
    return ew;
  }
  scored.sort((a, b) => a.r - b.r || (a.sym < b.sym ? -1 : 1));
  const w = {};
  for (const c of scored.slice(0, top)) w[c.sym] = 1 / top;
  return w;
}
