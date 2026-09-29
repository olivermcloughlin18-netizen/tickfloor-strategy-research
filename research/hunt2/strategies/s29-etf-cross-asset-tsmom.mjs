export const meta = {
  id: "s29-etf-cross-asset-tsmom",
  name: "Cross-asset time-series momentum (bonds signal stocks, stocks signal bonds)",
  family: "momentum",
  source: "Pitkajarvi, Suominen & Vaittinen 2020 JFE ('Cross-asset signals and time series momentum')",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "DIA", "TLT", "IEF", "SHY"],
  rebalance: "monthly",
  longShort: false,
  params: { lookback: 252 },
};

export function rank(universe, t, ctx) {
  const n = ctx.params.lookback;
  const qqq = universe.QQQ;
  const ief = universe.IEF;
  if (!qqq || !ief || qqq.length < n + 1 || ief.length < n + 1) return {};

  const qqqReturn = qqq[qqq.length - 1].close / qqq[qqq.length - 1 - n].close - 1;
  const iefReturn = ief[ief.length - 1].close / ief[ief.length - 1 - n].close - 1;
  const weights = {};

  if (iefReturn > 0) {
    weights.QQQ = 0.25;
    weights.DIA = 0.25;
  } else {
    weights.SHY = 0.5;
  }

  if (qqqReturn < 0) {
    weights.TLT = 0.25;
    weights.IEF = 0.25;
  } else {
    weights.SHY = (weights.SHY || 0) + 0.5;
  }

  return weights;
}
