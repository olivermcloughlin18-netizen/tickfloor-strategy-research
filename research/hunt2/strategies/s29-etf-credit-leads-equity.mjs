export const meta = {
  id: "s29-etf-credit-leads-equity",
  name: "Credit leads equity: weekly HYG-vs-IEF relative return",
  family: "other",
  source: "Kwan 1996 JFE (firm-specific information in stock and bond returns); Norden & Weber 2009 EFM (credit markets lead equity)",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "DIA", "HYG", "IEF", "SHY"],
  rebalance: "weekly",
  longShort: false,
  params: { lookback: 5 },
};

export function rank(universe, t, ctx) {
  const n = ctx.params.lookback;
  const hyg = universe.HYG;
  const ief = universe.IEF;
  if (!hyg || !ief || hyg.length < n + 1 || ief.length < n + 1) return {};

  const hygReturn = hyg[hyg.length - 1].close / hyg[hyg.length - 1 - n].close - 1;
  const iefReturn = ief[ief.length - 1].close / ief[ief.length - 1 - n].close - 1;
  return hygReturn - iefReturn >= 0
    ? { QQQ: 0.5, DIA: 0.5 }
    : { IEF: 0.5, SHY: 0.5 };
}
