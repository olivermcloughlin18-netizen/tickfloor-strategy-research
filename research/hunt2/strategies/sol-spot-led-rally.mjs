export const meta = {
  id: "sol-spot-led-rally",
  name: "High spot turnover rally without new perp leverage",
  family: "oi-spot-disagreement",
  source: "https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Open-Interest-Statistics",
  assetClass: "crypto",
  timeframe: "1h",
  assets: ["BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "LINKUSDT", "TRXUSDT"],
  longShort: false,
  holdBars: 120,
  params: {
    priceLookbackHours: 24,
    minPriceRise: 0.03,
    minVolumeMultiple: 2,
    volumeHistoryDays: 7,
    maxUnitOiRise: 0.02,
    holdHours: 120,
    cooldownHours: 120,
  },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  const s = ctx.state;
  const historyHours = p.volumeHistoryDays * 24;

  if (s.currentTurnover === undefined) {
    s.currentTurnover = ctx.rolling(p.priceLookbackHours);
    s.priorTurnover = ctx.rolling(historyHours);
    s.nextEligible = 0;
    s.armed = true;
  }

  s.currentTurnover.push(bars[i].close * bars[i].volume);
  if (i >= p.priceLookbackHours) {
    const priorBar = bars[i - p.priceLookbackHours];
    s.priorTurnover.push(priorBar.close * priorBar.volume);
  }

  let predicate = false;
  if (s.currentTurnover.full() && s.priorTurnover.full()) {
    const priorClose = bars[i - p.priceLookbackHours].close;
    const oiNow = ctx.openInterest(i);
    const oiPrior = ctx.openInterest(i - p.priceLookbackHours);

    if (oiNow !== null && oiPrior !== null && bars[i].close > 0 && priorClose > 0 && oiPrior > 0) {
      const priceRise = bars[i].close / priorClose - 1;
      const unitOiRise = (oiNow / bars[i].close) / (oiPrior / priorClose) - 1;
      const priorDailyMean = s.priorTurnover.sum() / p.volumeHistoryDays;
      predicate = priceRise >= p.minPriceRise
        && s.currentTurnover.sum() >= p.minVolumeMultiple * priorDailyMean
        && unitOiRise <= p.maxUnitOiRise;
    }
  }

  if (!predicate) s.armed = true;
  if (i < s.nextEligible || !predicate || !s.armed) return 0;

  s.armed = false;
  s.nextEligible = i + p.holdHours + p.cooldownHours;
  return 1;
}
