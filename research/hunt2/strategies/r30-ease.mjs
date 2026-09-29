export const meta = {
  "id": "r30-ease",
  "name": "Ease of movement",
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
    "rule": "Long when mean14 of midpoint-change times range / volume > 0 and close > SMA200; zero volume contributes zero.",
    "signalLagBars": 1,
    "warmupBars": 200
  }
};
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  let x=0;for(let k=i-13;k<=i;k++){const b=bars[k],p=bars[k-1];x+=b.volume?((b.high+b.low-p.high-p.low)/2)*(b.high-b.low)/b.volume:0;}return x>0&&c>ctx.sma('close',200,i)?1:0;
}
