export const meta = {
  "id": "r30-adosc",
  "name": "Accumulation distribution oscillator",
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
    "rule": "Long when EMA3 minus EMA10 of cumulative close-location volume > 0.",
    "signalLagBars": 1,
    "warmupBars": 200
  }
};
function ema(ctx,key,x,n){const old=ctx.state[key];const next=old===undefined?x:old+2/(n+1)*(x-old);ctx.state[key]=next;return next;}
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  const b=bars[i];const flow=(b.high>b.low?(2*c-b.high-b.low)/(b.high-b.low):0)*b.volume;const ad=(ctx.state.ad??0)+flow;ctx.state.ad=ad;return ema(ctx,'ad3',ad,3)>ema(ctx,'ad10',ad,10)?1:0;
}
