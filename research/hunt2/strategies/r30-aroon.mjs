export const meta = {
  "id": "r30-aroon",
  "name": "Aroon trend persistence",
  "family": "trend",
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
    "rule": "Long when Aroon(25) up-minus-down > 50.",
    "signalLagBars": 1,
    "warmupBars": 200
  }
};
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  let hi=i-24,lo=i-24; for(let k=i-24;k<=i;k++){if(bars[k].high>=bars[hi].high)hi=k;if(bars[k].low<=bars[lo].low)lo=k;} return (hi-lo)/25*100>50?1:0;
}
