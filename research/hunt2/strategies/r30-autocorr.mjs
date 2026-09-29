export const meta = {
  "id": "r30-autocorr",
  "name": "Serial-correlation momentum gate",
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
    "rule": "Long when Pearson lag-1 return correlation over 60 pairs > 0.1 and ROC20 > 0.",
    "signalLagBars": 1,
    "warmupBars": 200
  }
};
export function signal(bars, decisionIndex, ctx) {
  const i=decisionIndex-1; // Completed preceding bar, before the harness close fill.
  if(i<200) return 0;
  const c=bars[i].close;
  let x=0,y=0,xx=0,yy=0,xy=0;for(let k=i-59;k<=i;k++){const a=bars[k].close/bars[k-1].close-1,b=bars[k-1].close/bars[k-2].close-1;x+=a;y+=b;xx+=a*a;yy+=b*b;xy+=a*b;}const den=Math.sqrt(Math.max(0,(60*xx-x*x)*(60*yy-y*y)));return den>0&&(60*xy-x*y)/den>0.1&&c>bars[i-20].close?1:0;
}
