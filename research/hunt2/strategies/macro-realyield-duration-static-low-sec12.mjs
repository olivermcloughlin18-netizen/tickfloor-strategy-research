export const meta = {
  id: "macro-realyield-duration-static-low-sec12",
  name: "Static low real-yield-beta sector tilt (frozen control) (12 sector ETFs)",
  family: "macro-intermarket",
  source: "Matched naive control for macro-realyield-duration-leadlag: same universe, same 4 names, same daily rebalance, same costs, direction frozen — isolates the switching decision from the static defensive tilt.",
  assets: ["DIA", "XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "XLC", "VNQ"],
  assetClass: "etf",
  timeframe: "1d",
  rebalance: "daily",
  params: { BETA_WIN: 60, LEAD_WIN: 5, N: 4, MODE: "static_low" },
};

export function rank(universe, t, ctx) {
  if (ctx.state.init === undefined) {
    ctx.state.init = 1;
    ctx.state.y = [];
    ctx.state.dY = [];
    ctx.state.r = {};
    ctx.state.px = {};
  }
  const y = ctx.macro("DFII10");
  if (y === null) return {};
  ctx.state.y.push(y);
  if (ctx.state.y.length >= 2) {
    ctx.state.dY.push(ctx.state.y[ctx.state.y.length - 1] - ctx.state.y[ctx.state.y.length - 2]);
  } else {
    ctx.state.dY.push(0);
  }
  const symbols = ["DIA", "XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "XLC", "VNQ"];
  for (const S of symbols) {
    if (ctx.state.r[S] === undefined) ctx.state.r[S] = [];
    const b = universe[S];
    ctx.state.r[S].push(!b || b.length < 2 ? NaN : b[b.length - 1].close / b[b.length - 2].close - 1);
  }
  const n = ctx.state.dY.length;
  if (n < 66) return {};
  let lead = 0;
  for (let j = n - 5; j < n; j++) lead += ctx.state.dY[j];
  const scored = [];
  for (const S of symbols) {
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    let m = 0;
    for (let j = n - 60; j < n; j++) {
      const x = ctx.state.dY[j];
      const ry = ctx.state.r[S][j];
      if (!Number.isFinite(x) || !Number.isFinite(ry)) continue;
      sumX += x;
      sumY += ry;
      sumXY += x * ry;
      sumXX += x * x;
      m++;
    }
    if (m < 50) continue;
    const meanX = sumX / m;
    const meanY = sumY / m;
    const denominator = sumXX / m - meanX * meanX;
    if (denominator <= 0 || !Number.isFinite(denominator)) continue;
    scored.push([S, (sumXY / m - meanX * meanY) / denominator]);
  }
  scored.sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
  if (scored.length < 4) return {};
  const weights = {};
  for (const [S] of scored.slice(0, 4)) weights[S] = 0.25;
  return weights;
}
