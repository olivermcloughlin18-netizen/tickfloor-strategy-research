export const meta = {
  "id": "r30-dpo",
  "name": "Detrended price rebound",
  "family": "mean-reversion-statarb",
  "source": "research/prereg-2026-09-24.md; local unvalidated hypothesis",
  "assetClass": "us_stock",
  "timeframe": "1d",
  "assets": [
    "AAPL",
    "AMZN",
    "GOOGL",
    "JPM",
    "XOM",
    "JNJ",
    "V",
    "COST"
  ],
  "longShort": false,
  "params": {
    "rule": "Long for 5 bars when close[11 bars ago] minus current SMA20 < -1 ATR14 and current close > SMA200.",
    "signalLagBars": 1,
    "warmupBars": 200
  },
  "holdBars": 5
};
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  return bars[i-11].close-ctx.sma('close',20,i)<-ctx.atr(14,i)&&c>ctx.sma('close',200,i)?1:0;
}
