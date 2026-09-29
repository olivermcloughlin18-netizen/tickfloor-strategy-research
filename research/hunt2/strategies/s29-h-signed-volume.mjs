export const meta = {
  id: "s29-h-signed-volume",
  name: "Tick-rule order-flow imbalance with a weekly trend filter",
  family: "momentum",
  source: "Easley, Lopez de Prado & O'Hara 2012 RFS (flow toxicity, VPIN, tick-rule volume classification); Chordia & Subrahmanyam 2004 JFE (order imbalance predicts returns)",
  assetClass: "crypto",
  timeframe: "1h",
  assets: ["BTCUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "LINKUSDT", "TRXUSDT"],
  longShort: false,
  params: { window: 24, imb: 0.3, trend: 168, maxHold: 12 },
};

export function signal(bars, i, ctx) {
  if (ctx.state.entryBar === undefined) ctx.state.entryBar = -1;
  if (i < ctx.params.trend) return 0;

  let signedVolume = 0;
  let volume = 0;
  for (let k = i - ctx.params.window + 1; k <= i; k++) {
    const direction = bars[k].close > bars[k - 1].close ? 1 : bars[k].close < bars[k - 1].close ? -1 : 0;
    signedVolume += bars[k].volume * direction;
    volume += bars[k].volume;
  }
  const imbalance = volume === 0 ? 0 : signedVolume / volume;

  if (ctx.state.entryBar >= 0) {
    if (imbalance < 0 || i - ctx.state.entryBar >= ctx.params.maxHold) {
      ctx.state.entryBar = -1;
      return 0;
    }
    return 1;
  }

  if (imbalance >= ctx.params.imb && bars[i].close > ctx.sma("close", ctx.params.trend, i)) {
    ctx.state.entryBar = i;
    return 1;
  }
  return 0;
}
