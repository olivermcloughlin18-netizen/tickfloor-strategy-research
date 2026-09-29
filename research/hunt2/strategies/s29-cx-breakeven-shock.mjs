export const meta = {
  "id": "s29-cx-breakeven-shock",
  "name": "Crypto long after a 1-week jump in US breakeven inflation",
  "family": "other",
  "source": "Choi & Shin 2022 Finance Research Letters ('Is Bitcoin an inflation hedge?': BTC rises after inflation-expectation shocks)",
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
    "TRXUSDT"
  ],
  "params": {
    "lag": 7,
    "jump": 0.1,
    "holdBars": 20
  }
};

export function signal(bars, i, ctx) {
  const { lag, jump, holdBars } = ctx.params;
  const st = ctx.state;
  if (st.left === undefined) st.left = 0;
  if (st.left > 0) { st.left--; return 1; }
  if (i < lag) return 0;
  const b = ctx.macro("T10YIE", i), bp = ctx.macro("T10YIE", i - lag);
  if (b === null || bp === null) return 0;
  if (b - bp >= jump) { st.left = holdBars - 1; return 1; }
  return 0;
}
