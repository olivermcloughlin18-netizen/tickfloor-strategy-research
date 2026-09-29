export const meta = {
  id: "r27-sector-seasonality",
  name: "Sector ETF same-calendar-month seasonality, top 3",
  family: "seasonality",
  source:
    "Heston & Sadka 2008 JFE (seasonality in the cross-section, including industries); Keloharju, Linnainmaa & Nyberg 2016 JF 'Return seasonalities'",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "XLC", "VNQ"],
  rebalance: "monthly",
  params: { minYears: 3, top: 3, minNames: 6 },
};

export function rank(universe, t, ctx) {
  const { minYears, top, minNames } = ctx.params;
  const symbols = Object.keys(universe);

  const td = new Date(t * 1000);
  const curMonth = td.getUTCMonth();
  const targetMonth = (curMonth + 1) % 12;
  const targetYear = td.getUTCFullYear() + (curMonth === 11 ? 1 : 0);

  const scores = [];
  for (const sym of symbols) {
    const b = universe[sym];
    const monthly = ctx.resample(b, "1M");
    const complete = monthly.filter((m) => m.complete);
    if (complete.length < 2) continue;

    let sum = 0;
    let n = 0;
    for (let k = 1; k < complete.length; k++) {
      const prev = complete[k - 1];
      const cur = complete[k];
      if (!Number.isFinite(prev.close) || !Number.isFinite(cur.close) || prev.close <= 0) continue;

      // only consecutive calendar months form a valid monthly return
      const pd = new Date(prev.time * 1000);
      const cd = new Date(cur.time * 1000);
      const expectedMonth = (pd.getUTCMonth() + 1) % 12;
      const expectedYear = pd.getUTCFullYear() + (pd.getUTCMonth() === 11 ? 1 : 0);
      if (cd.getUTCMonth() !== expectedMonth || cd.getUTCFullYear() !== expectedYear) continue;

      // only the target calendar month, and only years strictly earlier than
      // the year the upcoming target-month occurrence falls in
      if (cd.getUTCMonth() !== targetMonth || cd.getUTCFullYear() >= targetYear) continue;

      const ret = cur.close / prev.close - 1;
      if (!Number.isFinite(ret)) continue;
      sum += ret;
      n++;
    }

    if (n < minYears) continue;
    const mean = sum / n;
    if (!Number.isFinite(mean)) continue;
    scores.push([sym, mean]);
  }

  if (scores.length < minNames) {
    const w = {};
    for (const sym of symbols) w[sym] = 1 / symbols.length;
    return w;
  }

  scores.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const picked = scores.slice(0, top);
  const w = {};
  for (const [sym] of picked) w[sym] = 1 / picked.length;
  return w;
}
