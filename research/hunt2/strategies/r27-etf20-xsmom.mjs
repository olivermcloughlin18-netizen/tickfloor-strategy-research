// 12-1 cross-sectional momentum over a fixed 20-ETF universe (excludes futures-based
// USO/UNG/DBC/UUP and cash-like SHY). Top 5 by (close[e-skip]/close[e-lookback]-1), EW.
export const meta = {
  id: "r27-etf20-xsmom",
  name: "Cross-asset 12-1 momentum, top 5 of 20 ETFs",
  family: "momentum",
  source:
    "u/QuanTradin, r/Trading 1wop3th (12-1 momentum 'came in with a prior'; 'the ones that keep working tend to be the ones where you can say out loud why the edge exists'); Asness, Moskowitz & Pedersen 2013 JF 'Value and momentum everywhere'. The universe is the 25-ETF list minus the futures-based USO, UNG, DBC, UUP and the cash-like SHY, fixed now.",
  assetClass: "etf",
  timeframe: "1d",
  assets: [
    "QQQ", "DIA", "XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU",
    "XLB", "XLC", "VNQ", "TLT", "IEF", "LQD", "HYG", "AGG", "GLD", "SLV",
  ],
  rebalance: "monthly",
  params: { lag: 2, lookback: 252, skip: 21, need: 254, top: 5, minNames: 10 },
};

export function rank(universe, t, ctx) {
  const { lag, lookback, skip, need, top, minNames } = ctx.params;
  const names = Object.keys(universe).sort();

  // EW present: weight 1/n on every symbol trading in the universe today.
  const n = names.length;
  const ew = {};
  for (const sym of names) ew[sym] = 1 / n;

  const scored = [];
  for (const sym of names) {
    const b = universe[sym];
    const L = b.length;
    if (L < need) continue;
    const e = L - lag; // session before the rebalance session
    const iSkip = e - skip;
    const iLook = e - lookback;
    if (iLook < 0) continue;
    const cSkip = b[iSkip].close;
    const cLook = b[iLook].close;
    if (!Number.isFinite(cSkip) || !Number.isFinite(cLook) || cLook === 0) continue;
    scored.push({ sym, score: cSkip / cLook - 1 });
  }

  if (scored.length < minNames) return ew;

  scored.sort((a, b) => b.score - a.score || (a.sym < b.sym ? -1 : 1));
  const chosen = scored.slice(0, top);
  const w = {};
  for (const c of chosen) w[c.sym] = 1 / chosen.length;
  return w;
}
