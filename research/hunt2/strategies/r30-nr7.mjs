export const meta = {
  "id": "r30-nr7",
  "name": "Narrowest seven-bar range breakout",
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
    "rule": "Long 5 bars after close breaks previous high, where previous range is smallest of the preceding 7 bars.",
    "signalLagBars": 1,
    "warmupBars": 200
  },
  "holdBars": 5
};
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  const r=k=>bars[k].high-bars[k].low;let narrow=true;for(let k=i-7;k<i-1;k++)if(r(k)<r(i-1))narrow=false;return narrow&&c>bars[i-1].high?1:0;
}
