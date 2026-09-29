export const meta = {
  "id": "r30-force",
  "name": "Elder force index",
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
    "rule": "Long when EMA13 of volume times close change > 0 and close > SMA200.",
    "signalLagBars": 1,
    "warmupBars": 200
  }
};
function ema(ctx,key,x,n){const old=ctx.state[key];const next=old===undefined?x:old+2/(n+1)*(x-old);ctx.state[key]=next;return next;}
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  return ema(ctx,'force',bars[i].volume*(c-bars[i-1].close),13)>0&&c>ctx.sma('close',200,i)?1:0;
}
