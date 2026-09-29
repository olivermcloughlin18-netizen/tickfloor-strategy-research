// Sell in May and go away (Halloween effect). SPY is holdout -> QQQ proxy per README INDEX_PROXY rule.
export const meta = {
  id: "calendar-sell-in-may",
  name: "Sell in May and go away (Halloween effect)",
  family: "seasonality",
  source: "Bouman & Jacobsen 2002 AER; Jacobsen & Zhang 2020 working paper",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ"],
  proxyFor: { SPY: "QQQ" },
  params: {},
};

// Long Nov 1 - Apr 30, flat May 1 - Oct 31.
export function signal(bars, i, ctx) {
  const month = new Date(bars[i].time * 1000).getUTCMonth(); // 0=Jan .. 11=Dec
  return (month >= 10 || month <= 3) ? 1 : 0; // Nov(10),Dec(11),Jan(0),Feb(1),Mar(2),Apr(3)
}
