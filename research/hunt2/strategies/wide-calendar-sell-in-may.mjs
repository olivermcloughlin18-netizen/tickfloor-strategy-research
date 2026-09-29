// Sell in May and go away (Halloween effect). SPY is holdout -> QQQ proxy per README INDEX_PROXY rule.
export const meta = {
  id: "wide-calendar-sell-in-may",
  name: "Sell in May and go away (Halloween effect) (wide US stocks)",
  family: "seasonality",
  source: "Bouman & Jacobsen 2002 AER; Jacobsen & Zhang 2020 working paper",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",

  params: {},
};

// Long Nov 1 - Apr 30, flat May 1 - Oct 31.
export function signal(bars, i, ctx) {
  const month = new Date(bars[i].time * 1000).getUTCMonth(); // 0=Jan .. 11=Dec
  return (month >= 10 || month <= 3) ? 1 : 0; // Nov(10),Dec(11),Jan(0),Feb(1),Mar(2),Apr(3)
}
