export const meta = {
  id: "rsi2_btc",
  name: "Connors RSI(2) pullback on BTC daily",
  family: "mean_reversion",
  source: "Connors & Alvarez 2008, Short Term Trading Strategies That Work",
  assetClass: "crypto",
  timeframe: "1d",
  assets: ["BTCUSDT"],
  params: { rsiPeriod: 2, entryBelow: 10, trendWindow: 200, exitWindow: 5 },
};

function sma(bars, i, n) {
  let s = 0;
  for (let k = i - n + 1; k <= i; k++) s += bars[k].close;
  return s / n;
}

// Wilder RSI kept incrementally in ctx.state (signal is called for i = 0, 1, 2, ...)
export function signal(bars, i, ctx) {
  const p = ctx.params;
  const st = ctx.state;
  if (i === 0) { st.gain = 0; st.loss = 0; st.rsi = null; st.pos = 0; return 0; }
  const d = bars[i].close - bars[i - 1].close;
  const g = d > 0 ? d : 0, l = d < 0 ? -d : 0;
  if (i <= p.rsiPeriod) {
    st.gain += g / p.rsiPeriod; st.loss += l / p.rsiPeriod;
  } else {
    st.gain = (st.gain * (p.rsiPeriod - 1) + g) / p.rsiPeriod;
    st.loss = (st.loss * (p.rsiPeriod - 1) + l) / p.rsiPeriod;
  }
  if (i >= p.rsiPeriod) st.rsi = st.loss === 0 ? 100 : 100 - 100 / (1 + st.gain / st.loss);
  if (i + 1 < p.trendWindow || st.rsi === null) return 0;
  const close = bars[i].close;
  if (st.pos === 0 && st.rsi < p.entryBelow && close > sma(bars, i, p.trendWindow)) st.pos = 1;
  else if (st.pos === 1 && close > sma(bars, i, p.exitWindow)) st.pos = 0;
  return st.pos;
}
