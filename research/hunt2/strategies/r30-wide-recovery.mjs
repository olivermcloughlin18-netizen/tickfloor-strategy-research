export const meta = {
  "id": "r30-wide-recovery",
  "name": "Wide down-bar recovery",
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
    "rule": "Long 5 bars when previous down candle range > 2 prior ATR14 and current close recovers above its midpoint.",
    "signalLagBars": 1,
    "warmupBars": 200
  },
  "holdBars": 5
};
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  const p=bars[i-1];return p.close<p.open&&p.high-p.low>2*ctx.atr(14,i-2)&&c>(p.high+p.low)/2?1:0;
}
