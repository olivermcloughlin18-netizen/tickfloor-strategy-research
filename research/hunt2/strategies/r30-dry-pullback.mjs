export const meta = {
  "id": "r30-dry-pullback",
  "name": "Low-volume trend pullback",
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
    "rule": "Long 5 bars after 3 falling closes, current volume < half prior SMA20 volume, and close > SMA200.",
    "signalLagBars": 1,
    "warmupBars": 200
  },
  "holdBars": 5
};
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  return c<bars[i-1].close&&bars[i-1].close<bars[i-2].close&&bars[i-2].close<bars[i-3].close&&bars[i].volume<0.5*ctx.sma('volume',20,i-1)&&c>ctx.sma('close',200,i)?1:0;
}
