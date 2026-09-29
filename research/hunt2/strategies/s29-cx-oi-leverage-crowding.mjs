export const meta = {
  id: "s29-cx-oi-leverage-crowding",
  name: "Trend held only while leverage (OI per unit of turnover) is below its median",
  family: "trend",
  source: "Adrian & Shin 2010 JFI (leverage cycles); Brunnermeier & Pedersen 2009; crypto desk use of OI/volume 'leverage ratio'",
  assetClass: "crypto",
  timeframe: "1d",
  assets: ["BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "LINKUSDT", "TRXUSDT"],
  longShort: false,
  params: { volWindow: 30, medWindow: 180, sma: 50 },
};

export function signal(bars, i, ctx) {
  if (ctx.state.leverage === undefined) ctx.state.leverage = [];

  const oi = ctx.openInterest();
  if (oi === null || i < ctx.params.volWindow - 1) return 0;

  let turnover = 0;
  for (let k = i - ctx.params.volWindow + 1; k <= i; k++) {
    turnover += bars[k].close * bars[k].volume;
  }
  const leverage = oi / (turnover / ctx.params.volWindow);
  ctx.state.leverage.push(leverage);

  if (ctx.state.leverage.length < ctx.params.medWindow + 1 || i < ctx.params.sma - 1) return 0;

  const prior = ctx.state.leverage.slice(-ctx.params.medWindow - 1, -1).sort((a, b) => a - b);
  const middle = ctx.params.medWindow / 2;
  const median = (prior[middle - 1] + prior[middle]) / 2;

  return bars[i].close > ctx.sma("close", ctx.params.sma, i) && leverage < median ? 1 : 0;
}
