export const meta = {
  id: "s29-us-minervini-template",
  name: "Minervini trend template screen",
  family: "trend",
  source: "Minervini 2013 'Trade Like a Stock Market Wizard' (trend template)",
  assetClass: "us_stock",
  timeframe: "1d",
  assets: [
    "AAPL", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "JPM", "V", "UNH", "XOM",
    "JNJ", "COST", "ABBV", "MRK", "AVGO", "CVX", "WMT", "BAC", "ORCL", "ADBE",
    "CRM", "NFLX", "AMD", "INTC", "ABT", "MCD", "DIS", "QCOM", "TXN", "HON",
    "CAT", "LOW", "SBUX", "BA", "UPS", "PFE", "T", "MDT", "UNP", "MMM",
  ],
  rebalance: "weekly",
  longShort: false,
  params: { rsPct: 0.3, fromLow: 1.3, fromHigh: 0.75, slopeLag: 21 },
};

function sma(bars, end, length) {
  let sum = 0;
  for (let i = end - length + 1; i <= end; i++) sum += bars[i].close;
  return sum / length;
}

export function rank(universe, t, ctx) {
  const eligible = [];

  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];
    if (bars.length < 253) continue;

    const end = bars.length - 1;
    let low252 = Infinity;
    let high252 = -Infinity;
    for (let i = end - 251; i <= end; i++) {
      if (bars[i].low < low252) low252 = bars[i].low;
      if (bars[i].high > high252) high252 = bars[i].high;
    }

    eligible.push({
      sym,
      close: bars[end].close,
      sma50: sma(bars, end, 50),
      sma150: sma(bars, end, 150),
      sma200: sma(bars, end, 200),
      sma200Prior: sma(bars, end - ctx.params.slopeLag, 200),
      low252,
      high252,
      return252: bars[end].close / bars[end - 252].close - 1,
    });
  }

  eligible.sort((a, b) => b.return252 - a.return252 || (a.sym < b.sym ? -1 : 1));
  const topCount = Math.ceil(eligible.length * ctx.params.rsPct);
  const passing = eligible.slice(0, topCount).filter((stock) =>
    stock.close > stock.sma150 &&
    stock.close > stock.sma200 &&
    stock.sma150 > stock.sma200 &&
    stock.sma200 > stock.sma200Prior &&
    stock.sma50 > stock.sma150 &&
    stock.close > stock.sma50 &&
    stock.close >= ctx.params.fromLow * stock.low252 &&
    stock.close >= ctx.params.fromHigh * stock.high252
  );

  const weights = {};
  for (const stock of passing) weights[stock.sym] = 1 / passing.length;
  return weights;
}
