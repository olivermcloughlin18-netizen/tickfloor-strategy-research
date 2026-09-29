export const meta = {
  "id": "r30-parkinson",
  "name": "Range-volatility momentum gate",
  "family": "volatility",
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
    "rule": "Long when mean squared log(high/low) over 10 bars < half its 60-bar mean and ROC60 > 0.",
    "signalLagBars": 1,
    "warmupBars": 200
  }
};
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  let short=0,long=0;for(let k=i-59;k<=i;k++){const x=Math.log(bars[k].high/bars[k].low)**2;long+=x;if(k>i-10)short+=x;}return short/10<0.5*long/60&&c>bars[i-60].close?1:0;
}
