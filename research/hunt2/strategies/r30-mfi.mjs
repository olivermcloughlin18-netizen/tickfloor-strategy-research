export const meta = {
  "id": "r30-mfi",
  "name": "Money flow index exhaustion",
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
    "rule": "Long 5 bars when MFI14 < 20 and close > SMA200; ties contribute no flow.",
    "signalLagBars": 1,
    "warmupBars": 200
  },
  "holdBars": 5
};
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  const tp=k=>(bars[k].high+bars[k].low+bars[k].close)/3;let up=0,down=0;for(let k=i-13;k<=i;k++){const x=tp(k),prev=tp(k-1);if(x>prev)up+=x*bars[k].volume;if(x<prev)down+=x*bars[k].volume;}return up+down>0&&100*up/(up+down)<20&&c>ctx.sma('close',200,i)?1:0;
}
