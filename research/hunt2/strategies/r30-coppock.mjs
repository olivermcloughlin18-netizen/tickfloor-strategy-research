export const meta = {
  "id": "r30-coppock",
  "name": "Daily Coppock curve",
  "family": "momentum",
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
    "rule": "Long when 10-bar linearly weighted mean of ROC(11)+ROC(14) is positive. Daily adaptation.",
    "signalLagBars": 1,
    "warmupBars": 200
  }
};
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  let x=0;for(let j=0;j<10;j++){const k=i-j;x+=(10-j)*(bars[k].close/bars[k-11].close+bars[k].close/bars[k-14].close-2);}return x/55>0?1:0;
}
