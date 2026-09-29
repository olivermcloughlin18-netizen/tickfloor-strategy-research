// Style momentum: rotate monthly into whichever of QQQ (growth) or DIA (value/blue-chip)
// has the higher 126-session return as of 2 sessions before the rebalance.

export const meta = {
  id: "r27-qqq-dia-style-mom",
  name: "QQQ or DIA by 6-month relative strength",
  family: "momentum",
  source: "u/AlgoTradingQuant, r/Trading 1wop3th (of thousands of rules tested on SPY/QQQ only a dozen or two beat buy-and-hold); Barberis & Shleifer 2003 JFE (style investing and style momentum)",
  assetClass: "etf",
  assets: ["QQQ", "DIA"],
  timeframe: "1d",
  rebalance: "monthly",
  params: { lag: 2, lookback: 126, need: 128 },
};

// weight 1/n on each of the n symbols present in universe that day
function ewPresent(universe) {
  const syms = Object.keys(universe).filter(s => s === "QQQ" || s === "DIA").sort();
  const w = {};
  for (const s of syms) w[s] = 1 / syms.length;
  return w;
}

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const qqq = universe.QQQ;
  const dia = universe.DIA;
  if (!qqq || !dia) return ewPresent(universe);
  if (qqq.length < p.need || dia.length < p.need) return ewPresent(universe);

  const eq = qqq.length - p.lag;
  const ed = dia.length - p.lag;
  const cq = qqq[eq].close, cq0 = qqq[eq - p.lookback].close;
  const cd = dia[ed].close, cd0 = dia[ed - p.lookback].close;
  if (!Number.isFinite(cq) || !Number.isFinite(cq0) || !Number.isFinite(cd) || !Number.isFinite(cd0)) {
    return ewPresent(universe);
  }

  const mq = cq / cq0 - 1;
  const md = cd / cd0 - 1;
  if (!Number.isFinite(mq) || !Number.isFinite(md)) return ewPresent(universe);

  return mq > md ? { QQQ: 1 } : { DIA: 1 }; // tie -> DIA
}
