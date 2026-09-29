export const meta = {
  "id": "r30-cmo",
  "name": "Chande momentum dip",
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
    "rule": "Long 5 bars when CMO14 < -50 and close > SMA200.",
    "signalLagBars": 1,
    "warmupBars": 200
  },
  "holdBars": 5
};
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  let up=0,down=0;for(let k=i-13;k<=i;k++){const d=bars[k].close-bars[k-1].close;up+=Math.max(d,0);down+=Math.max(-d,0);}return up+down>0&&100*(up-down)/(up+down)<-50&&c>ctx.sma('close',200,i)?1:0;
}
