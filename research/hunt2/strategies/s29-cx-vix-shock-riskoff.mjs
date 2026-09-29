export const meta = {
  id: "s29-cx-vix-shock-riskoff",
  name: "50-day trend with a 10-day stand-down after an equity VIX shock",
  family: "trend",
  source: "Corbet, Larkin & Lucey 2020 FRL and Kristoufek 2023 (crypto-equity contagion rises in stress); VIX-shock risk-off practice",
  assetClass: "crypto",
  timeframe: "1d",
  assets: [
    "BTCUSDT",
    "BNBUSDT",
    "XRPUSDT",
    "ADAUSDT",
    "DOGEUSDT",
    "LTCUSDT",
    "LINKUSDT",
    "TRXUSDT",
    "BCHUSDT",
    "ATOMUSDT",
    "ETCUSDT",
    "DASHUSDT",
    "ZECUSDT",
    "AVAXUSDT",
    "UNIUSDT",
    "NEARUSDT",
    "AAVEUSDT",
    "HBARUSDT",
  ],
  longShort: false,
  params: { sma: 50, vixLag: 7, vixJump: 1.25, standDown: 10 },
};

export function signal(bars, i, ctx) {
  const { sma, vixLag, vixJump, standDown } = ctx.params;
  if (i < sma + vixLag) return 0;

  for (let j = i - standDown + 1; j <= i; j++) {
    const currentVix = ctx.macro("VIX", j);
    const priorVix = ctx.macro("VIX", j - vixLag);
    if (currentVix !== null && priorVix !== null && currentVix >= vixJump * priorVix) return 0;
  }

  return bars[i].close > ctx.sma("close", sma, i) ? 1 : 0;
}
