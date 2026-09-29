export const meta = {
  "id": "r30-vortex",
  "name": "Vortex directional movement",
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
    "rule": "Long when 14-bar sum(abs(high-prevLow)) exceeds sum(abs(low-prevHigh)).",
    "signalLagBars": 1,
    "warmupBars": 200
  }
};
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  let up=0,down=0; for(let k=i-13;k<=i;k++){up+=Math.abs(bars[k].high-bars[k-1].low);down+=Math.abs(bars[k].low-bars[k-1].high);} return up>down?1:0;
}
