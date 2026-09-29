export const meta = {
  "id": "r30-tsi",
  "name": "True strength momentum",
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
    "rule": "Long when double EMA(25,13) of close changes is positive relative to double EMA of absolute changes. EMAs seed at first eligible input.",
    "signalLagBars": 1,
    "warmupBars": 200
  }
};
function ema(ctx,key,x,n){const old=ctx.state[key];const next=old===undefined?x:old+2/(n+1)*(x-old);ctx.state[key]=next;return next;}
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  const d=c-bars[i-1].close;const num=ema(ctx,'t2',ema(ctx,'t1',d,25),13);const den=ema(ctx,'a2',ema(ctx,'a1',Math.abs(d),25),13);return den>0&&num/den>0?1:0;
}
