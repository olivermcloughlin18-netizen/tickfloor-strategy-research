export const meta = {
  "id": "r30-trix",
  "name": "Triple-smoothed rate of change",
  "family": "momentum",
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
    "rule": "Long while triple EMA(15) of close rises; seed each EMA at first eligible input.",
    "signalLagBars": 1,
    "warmupBars": 200
  }
};
function ema(ctx,key,x,n){const old=ctx.state[key];const next=old===undefined?x:old+2/(n+1)*(x-old);ctx.state[key]=next;return next;}
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  const x=ema(ctx,'e3',ema(ctx,'e2',ema(ctx,'e1',c,15),15),15);const prev=ctx.state.last??x;ctx.state.last=x;return x>prev?1:0;
}
