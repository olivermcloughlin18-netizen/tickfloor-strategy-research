export const meta = {
  id: "s29-etf-bond-vol-gate",
  name: "Treasury volatility gate for equities (MOVE proxy)",
  family: "volatility",
  source: "Choi, Mueller & Vedolin 2017 RFS ('Bond variance risk premiums'); Connolly, Stivers & Sun 2005 JFQA",
  assetClass: "etf",
  timeframe: "1d",
  universe: "ETFS_DAILY",
  rebalance: "weekly",
  params: { window: 21, base: 252, pct: 0.8 },
};

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const tlt = universe.TLT;
  if (!tlt || tlt.length < p.window + p.base + 1) return {};
  const rv = (end) => { // sample std of daily returns of the window days ending at index end
    let sum = 0, sq = 0;
    for (let k = end - p.window + 1; k <= end; k++) { const r = tlt[k].close / tlt[k - 1].close - 1; sum += r; sq += r * r; }
    const m = sum / p.window;
    return Math.sqrt(Math.max(0, (sq - p.window * m * m) / (p.window - 1)));
  };
  const n = tlt.length - 1;
  const hist = [];
  for (let k = n - p.base; k <= n - 1; k++) hist.push(rv(k));
  hist.sort((a, b) => a - b);
  const pos = p.pct * (hist.length - 1), lo = Math.floor(pos);
  const p80 = hist[lo] + (hist[Math.min(lo + 1, hist.length - 1)] - hist[lo]) * (pos - lo);
  if (rv(n) > p80) return universe.SHY ? { SHY: 1 } : {};
  const w = {};
  if (universe.QQQ) w.QQQ = 0.5;
  if (universe.DIA) w.DIA = 0.5;
  return w;
}
