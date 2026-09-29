// Time-series momentum (28d) gated off by dollar strength (91d lag change in DTWEXBGS).
// A stronger dollar tightens cross-border dollar funding (Avdjiev/Du/Koch/Shin 2019; Bruno & Shin 2015 JME),
// and the dollar factor prices carry/momentum returns (Lustig, Roussanov & Verdelhan 2014 RFS).
export const meta = {
  id: "r27-cx-tsmom28-dollar",
  name: "Crypto 4-week momentum, flat while the dollar strengthens",
  family: "macro",
  source: "Avdjiev, Du, Koch & Shin 2019 AER: Insights (stronger dollar tightens cross-border dollar funding); Lustig, Roussanov & Verdelhan 2014 RFS (dollar factor); Bruno & Shin 2015 JME",
  assetClass: "crypto",
  timeframe: "1d",
  params: { lookback: 28, dollarLag: 91 },
};

export function signal(bars, i, ctx) {
  const close = bars[i].close;
  const d0 = ctx.macro("DTWEXBGS");
  const d1 = i >= ctx.params.dollarLag ? ctx.macro("DTWEXBGS", i - ctx.params.dollarLag) : null;
  const strong = d0 !== null && d1 !== null ? d0 > d1 : false;
  const trend = i < ctx.params.lookback ? true : close > bars[i - ctx.params.lookback].close;
  return trend && !strong ? 1 : 0;
}
