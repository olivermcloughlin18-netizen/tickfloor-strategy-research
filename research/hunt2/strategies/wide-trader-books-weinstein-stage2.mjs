// Weinstein Stage 2 breakout (Stan Weinstein, "Secrets for Profiting in Bull and Bear Markets", 1988).
export const meta = {
  id: "wide-trader-books-weinstein-stage2",
  name: "Weinstein Stage 2 breakout (wide US stocks)",
  family: "trend",
  source: "Stan Weinstein stage analysis",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",
  longShort: true,
  params: {
    smaLen: 30,          // 30-week SMA
    resistanceLookback: 10, // weeks used to define stage-1 resistance
    risingLookback: 4,   // weeks back to compare SMA slope
  },
};

export function signal(bars, i, ctx) {
  const { smaLen, resistanceLookback, risingLookback } = ctx.params;
  const weekly = ctx.resample(bars, "1w");
  const need = smaLen + resistanceLookback + risingLookback + 1;
  if (weekly.length < need) return 0;

  // use only completed weeks to keep the signal stable within a week
  const lastIdx = weekly[weekly.length - 1].complete === false ? weekly.length - 2 : weekly.length - 1;
  if (lastIdx < need - 1) return 0;

  const cur = weekly[lastIdx];

  let sum = 0, volSum = 0;
  for (let k = lastIdx - smaLen + 1; k <= lastIdx; k++) { sum += weekly[k].close; volSum += weekly[k].volume; }
  const sma = sum / smaLen;
  const avgVol = volSum / smaLen;

  let prevSum = 0;
  const pStart = lastIdx - risingLookback - smaLen + 1;
  for (let k = pStart; k <= pStart + smaLen - 1; k++) prevSum += weekly[k].close;
  const smaPrev = prevSum / smaLen;
  const rising = sma > smaPrev;

  let resistance = -Infinity;
  for (let k = lastIdx - resistanceLookback; k < lastIdx; k++) resistance = Math.max(resistance, weekly[k].high);

  if (ctx.state.pos === undefined) ctx.state.pos = 0;

  const breakout = cur.close > sma && rising && cur.close > resistance && cur.volume > avgVol;
  const breakdown = cur.close < sma && !rising;

  if (breakout && ctx.state.pos <= 0) ctx.state.pos = 1;
  else if (breakdown && ctx.state.pos >= 0) ctx.state.pos = -1;

  return ctx.state.pos;
}
