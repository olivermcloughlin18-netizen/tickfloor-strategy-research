export const meta = {
  "id": "dv-ctrl-r27-cx-tsmom28-fngfear",
  "name": "Matched buy-after-drop control for r27-cx-tsmom28-fngfear",
  "family": "deep-validation-control",
  "source": "robustness-0929.md (pre-registered matched-frequency dumb control)",
  "assetClass": "crypto",
  "timeframe": "1d",
  "holdBars": 22,
  "params": {
    "thr": 0.0005
  }
};
export function signal(bars, i, ctx) { return i >= 1 && bars[i].close / bars[i - 1].close - 1 <= -ctx.params.thr ? 1 : 0; }
