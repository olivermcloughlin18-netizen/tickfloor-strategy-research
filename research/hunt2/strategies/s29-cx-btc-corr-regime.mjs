export const meta = {
  id: "s29-cx-btc-corr-regime",
  name: "BTC-only when alts herd with BTC, trending alts otherwise",
  family: "other",
  source: "Bouri, Gupta & Roubaud 2019 FRL (herding in cryptocurrencies); Koutmos 2018 Econ. Letters (return and volatility spillovers)",
  assetClass: "crypto",
  timeframe: "1d",
  assets: [
    "BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT",
    "LINKUSDT", "TRXUSDT", "BCHUSDT", "ATOMUSDT", "ETCUSDT", "DASHUSDT",
    "ZECUSDT", "AVAXUSDT", "UNIUSDT", "NEARUSDT", "AAVEUSDT", "HBARUSDT",
  ],
  rebalance: "weekly",
  params: { corrWindow: 30, corrMax: 0.75, sma: 50, minAlts: 6 },
};

export function rank(universe, t, ctx) {
  const { corrWindow, corrMax, sma, minAlts } = ctx.params;
  const btc = universe.BTCUSDT;
  const btcOnly = { BTCUSDT: 1 };
  if (!btc || btc.length < corrWindow + 1) return btcOnly;

  const nb = btc.length;
  let btcMean = 0;
  for (let k = nb - corrWindow; k < nb; k++) {
    btcMean += btc[k].close / btc[k - 1].close - 1;
  }
  btcMean /= corrWindow;

  const eligible = [];
  let corrSum = 0;
  for (const sym of Object.keys(universe)) {
    if (sym === "BTCUSDT") continue;
    const bars = universe[sym];
    const n = bars.length;
    if (n < sma + 1) continue;

    let altMean = 0;
    for (let k = n - corrWindow; k < n; k++) {
      altMean += bars[k].close / bars[k - 1].close - 1;
    }
    altMean /= corrWindow;

    let covariance = 0, btcVariance = 0, altVariance = 0;
    for (let j = 0; j < corrWindow; j++) {
      const btcReturn = btc[nb - corrWindow + j].close / btc[nb - corrWindow + j - 1].close - 1;
      const altReturn = bars[n - corrWindow + j].close / bars[n - corrWindow + j - 1].close - 1;
      const bx = btcReturn - btcMean;
      const ax = altReturn - altMean;
      covariance += bx * ax;
      btcVariance += bx * bx;
      altVariance += ax * ax;
    }
    const denominator = Math.sqrt(btcVariance * altVariance);
    if (!(denominator > 0)) continue;
    corrSum += covariance / denominator;
    eligible.push(sym);
  }

  if (eligible.length < minAlts || corrSum / eligible.length >= corrMax) return btcOnly;

  const trending = [];
  for (const sym of eligible) {
    const bars = universe[sym];
    const n = bars.length;
    let sum = 0;
    for (let k = n - sma; k < n; k++) sum += bars[k].close;
    if (bars[n - 1].close > sum / sma) trending.push(sym);
  }
  if (!trending.length) return btcOnly;

  const weights = {};
  for (const sym of trending) weights[sym] = 1 / trending.length;
  return weights;
}
