export const meta = {
  "id": "r30-stoch",
  "name": "Stochastic oversold cross",
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
    "rule": "Long 5 bars when %K14 crosses above its 3-bar mean below 30 and close > SMA200.",
    "signalLagBars": 1,
    "warmupBars": 200
  },
  "holdBars": 5
};
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  const k=j=>{const d=ctx.donchian(14,j);return d.upper>d.lower?100*(bars[j].close-d.lower)/(d.upper-d.lower):50;};const now=k(i),prev=k(i-1);const d=(now+prev+k(i-2))/3,dp=(prev+k(i-2)+k(i-3))/3;return now>d&&prev<=dp&&now<30&&c>ctx.sma('close',200,i)?1:0;
}
