export const meta = {
  "id": "s29-cx-kst",
  "name": "Pring Know Sure Thing (KST) trend",
  "family": "momentum",
  "source": "Pring 1992 'Martin Pring on Market Momentum' (KST oscillator)",
  "assetClass": "crypto",
  "timeframe": "1d",
  "assets": [
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
    "HBARUSDT"
  ],
  "params": {
    "roc": [
      10,
      15,
      20,
      30
    ],
    "smooth": [
      10,
      10,
      10,
      15
    ],
    "weights": [
      1,
      2,
      3,
      4
    ],
    "signal": 9
  }
};

export function signal(bars, i, ctx) {
  if (i < 60) return 0;
  const P = ctx.params;
  if (ctx.state.kst === undefined) ctx.state.kst = [];
  const c = bars[i].close;
  let kst = 0;
  for (let q = 0; q < 4; q++) {
    // SMA of ROC over last smooth[q] values ending at i
    let s = 0;
    for (let k = i - P.smooth[q] + 1; k <= i; k++) s += 100 * (bars[k].close / bars[k - P.roc[q]].close - 1);
    kst += P.weights[q] * s / P.smooth[q];
  }
  ctx.state.kst[i] = kst;
  if (i < 60 + P.signal - 1) return 0;
  let sg = 0;
  for (let k = i - P.signal + 1; k <= i; k++) sg += ctx.state.kst[k];
  sg /= P.signal;
  return kst > sg && kst > 0 ? 1 : 0;
}
