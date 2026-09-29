export const meta = {
  "id": "r30-higher-lows",
  "name": "Five rising lows",
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
    "rule": "Long while five consecutive low-to-low increases occur and close > SMA50.",
    "signalLagBars": 1,
    "warmupBars": 200
  }
};
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  let ok=true;for(let k=i-4;k<=i;k++)if(bars[k].low<=bars[k-1].low)ok=false;return ok&&c>ctx.sma('close',50,i)?1:0;
}
