export const meta = {
  id: "r27-sector-52wh",
  name: "Sector ETF nearness to the 52-week high, top 3",
  family: "momentum",
  source: "George & Hwang 2004 JF (52-week-high momentum, with an industry version)",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "XLC", "VNQ"],
  rebalance: "monthly",
  params: { lag: 2, window: 252, need: 254, top: 3, minNames: 6 },
};

function ew(universe) {
  const syms = Object.keys(universe);
  const w = {};
  for (const sym of syms) w[sym] = 1 / syms.length;
  return w;
}

export function rank(universe, t, ctx) {
  const { lag, window, need, top, minNames } = ctx.params;
  const scored = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    const L = b.length;
    if (L < need) continue;
    const e = L - lag; // session before the rebalance session

    let maxHigh = -Infinity;
    let finite = true;
    for (let k = e - window + 1; k <= e; k++) {
      const h = b[k].high;
      if (!Number.isFinite(h)) { finite = false; break; }
      if (h > maxHigh) maxHigh = h;
    }
    const close = b[e].close;
    if (!finite || !Number.isFinite(close)) continue;

    scored.push([sym, close / maxHigh]);
  }

  if (scored.length < minNames) return ew(universe); // too few eligible names -> EW present

  scored.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)); // score desc, ties symbol asc
  const w = {};
  for (const [sym] of scored.slice(0, top)) w[sym] = 1 / top;
  return w;
}
