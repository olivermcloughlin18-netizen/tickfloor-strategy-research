export const meta = {
  "id": "r30-ulcer",
  "name": "Ulcer drawdown recovery",
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
    "rule": "Long when ulcer index14 falls below its value 5 bars ago and close > SMA200; each drawdown uses rolling 14-bar high close.",
    "signalLagBars": 1,
    "warmupBars": 200
  }
};
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  const ulcer=j=>{let x=0;for(let k=j-13;k<=j;k++){let hi=0;for(let z=k-13;z<=k;z++)hi=Math.max(hi,bars[z].close);x+=(bars[k].close/hi-1)**2;}return Math.sqrt(x/14);};return ulcer(i)<ulcer(i-5)&&c>ctx.sma('close',200,i)?1:0;
}
