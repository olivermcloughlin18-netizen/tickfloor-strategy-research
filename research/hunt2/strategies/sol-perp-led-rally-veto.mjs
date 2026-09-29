export const meta = {
  id: "sol-perp-led-rally-veto",
  name: "Avoid leverage-led rally with weak spot turnover",
  family: "oi-spot-disagreement",
  source: "https://arxiv.org/abs/2310.14973",
  assetClass: "crypto",
  timeframe: "1h",
  assets: ["BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "LINKUSDT", "TRXUSDT"],
  longShort: false,
  params: {
    priceLookbackHours: 24,
    minPriceRise: 0.03,
    minUnitOiRise: 0.1,
    spotVolumeMeanHours: 168,
    flatHours: 120,
  },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  const st = ctx.state;
  if (st.turnover === undefined) st.turnover = ctx.rolling(p.spotVolumeMeanHours);
  if (st.flatRemaining === undefined) st.flatRemaining = 0;
  if (st.armed === undefined) st.armed = true;

  const close = bars[i].close;
  const turnoverMean = st.turnover.full() ? st.turnover.mean() : NaN;
  st.turnover.push(close * bars[i].volume);

  if (st.flatRemaining > 0) {
    st.flatRemaining--;
    return 0;
  }

  let event = null;
  if (i >= p.priceLookbackHours && Number.isFinite(turnoverMean)) {
    const priorClose = bars[i - p.priceLookbackHours].close;
    const oiNow = ctx.openInterest(i);
    const oiPrior = ctx.openInterest(i - p.priceLookbackHours);
    if (oiNow !== null && oiPrior !== null && close > 0 && priorClose > 0 && oiPrior > 0) {
      event = close / priorClose - 1 >= p.minPriceRise
        && (oiNow / close) / (oiPrior / priorClose) - 1 >= p.minUnitOiRise
        && close * bars[i].volume < turnoverMean;
    }
  }

  if (event === false) st.armed = true;
  if (event === true && st.armed) {
    st.armed = false;
    st.flatRemaining = p.flatHours - 1;
    return 0;
  }
  return 1;
}
