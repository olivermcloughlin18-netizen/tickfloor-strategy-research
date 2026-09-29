// OI/price divergence momentum leg: price up 3d + OI up >10% 3d => long, held 3 days or -5% stop.
export const meta = {
  id: "crypto-oi-price-divergence",
  name: "Open interest / price momentum confirmation",
  family: "open interest divergence",
  source: "crypto derivatives trading folklore, Binance/Coinglass blog posts",
  assetClass: "crypto",
  timeframe: "1d",
  assets: ["BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "LINKUSDT", "TRXUSDT"],
  params: { lookback: 3, oiThresh: 0.10, holdBars: 3, stop: -0.05 },
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (ctx.state.entryBar === undefined) ctx.state.entryBar = -1;
  if (ctx.state.entryPrice === undefined) ctx.state.entryPrice = 0;

  // manage open position first
  if (ctx.state.entryBar >= 0) {
    const heldBars = i - ctx.state.entryBar;
    const ret = bars[i].close / ctx.state.entryPrice - 1;
    if (ret <= p.stop || heldBars >= p.holdBars) {
      ctx.state.entryBar = -1;
      return 0;
    }
    return 1;
  }

  if (i < p.lookback) return 0;
  const oiNow = ctx.openInterest(i);
  const oiPrev = ctx.openInterest(i - p.lookback);
  if (oiNow === null || oiPrev === null || oiPrev === 0) return 0;

  const priceChg = bars[i].close / bars[i - p.lookback].close - 1;
  const oiChg = oiNow / oiPrev - 1;

  if (priceChg > 0 && oiChg > p.oiThresh) {
    ctx.state.entryBar = i;
    ctx.state.entryPrice = bars[i].close;
    return 1;
  }
  return 0;
}
