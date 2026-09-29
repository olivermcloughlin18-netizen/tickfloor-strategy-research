export const meta = {
  "id": "dv-ctrl-r27-cx-tsmom-vote3h",
  "name": "Matched buy-after-drop control for r27-cx-tsmom-vote3h",
  "family": "deep-validation-control",
  "source": "robustness-0929.md (pre-registered matched-frequency dumb control)",
  "assetClass": "crypto",
  "timeframe": "1d",
  "holdBars": 12,
  "params": {
    "thr": 0.04196
  }
};
export function signal(bars, i, ctx) { return i >= 1 && bars[i].close / bars[i - 1].close - 1 <= -ctx.params.thr ? 1 : 0; }
