export const meta = {
  "id": "r30-nvi",
  "name": "Negative volume index",
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
    "rule": "NVI starts at 1000, compounds returns only on falling volume; long when above EMA50.",
    "signalLagBars": 1,
    "warmupBars": 200
  }
};
function ema(ctx,key,x,n){const old=ctx.state[key];const next=old===undefined?x:old+2/(n+1)*(x-old);ctx.state[key]=next;return next;}
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  let x=ctx.state.nvi??1000;if(bars[i].volume<bars[i-1].volume)x*=c/bars[i-1].close;ctx.state.nvi=x;return x>ema(ctx,'nviMean',x,50)?1:0;
}
