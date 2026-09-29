export const meta = {
  "id": "s29-cx-pump-fade",
  "name": "Fade volume-confirmed one-day pumps",
  "family": "mean_reversion",
  "source": "Li, Shin & Wang 2021 'Cryptocurrency pump-and-dump schemes' (SSRN); Hamrick et al. 2021 (pump signals and reversals)",
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
  "longShort": true,
  "params": {
    "pump": 0.15,
    "volMult": 4,
    "volWindow": 30,
    "holdBars": 5
  }
};

export function signal(bars, i, ctx) {
  const p = ctx.params;
  if (ctx.state.left === undefined) ctx.state.left = 0;
  if (ctx.state.left > 0) { ctx.state.left--; return -1; }
  if (i < p.volWindow) return 0;
  const vm = ctx.sma("volume", p.volWindow, i - 1);
  if (bars[i].close / bars[i - 1].close - 1 >= p.pump && bars[i].volume >= p.volMult * vm) {
    ctx.state.left = p.holdBars - 1;
    return -1;
  }
  return 0;
}
