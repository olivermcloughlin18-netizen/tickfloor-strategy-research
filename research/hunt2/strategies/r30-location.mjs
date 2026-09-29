export const meta = {
  "id": "r30-location",
  "name": "Persistent high closes",
  "family": "social-ta",
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
    "rule": "Long when average close location (close-low)/(high-low) over 20 bars > 0.6; zero range = 0.5.",
    "signalLagBars": 1,
    "warmupBars": 200
  }
};
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  let x=0;for(let k=i-19;k<=i;k++){const b=bars[k];x+=b.high>b.low?(b.close-b.low)/(b.high-b.low):0.5;}return x/20>0.6?1:0;
}
