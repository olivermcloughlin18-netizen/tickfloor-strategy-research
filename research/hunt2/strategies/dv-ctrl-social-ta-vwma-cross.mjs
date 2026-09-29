export const meta = {
  "id": "dv-ctrl-social-ta-vwma-cross",
  "name": "Matched buy-after-drop control for social-ta-vwma-cross",
  "family": "deep-validation-control",
  "source": "robustness-0929.md (pre-registered matched-frequency dumb control)",
  "assetClass": "crypto",
  "timeframe": "1d",
  "holdBars": 8,
  "params": {
    "thr": 0.03975
  }
};
export function signal(bars, i, ctx) { return i >= 1 && bars[i].close / bars[i - 1].close - 1 <= -ctx.params.thr ? 1 : 0; }
