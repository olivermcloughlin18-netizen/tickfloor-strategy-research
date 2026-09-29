export const meta = {
  id: "s29-us-52wh-volume-breakout",
  name: "52-week-high breakout on double volume",
  family: "trend",
  source: "O'Neil 1988 'How to Make Money in Stocks' (breakouts on volume); Gervais, Kaniel & Mingelgrin 2001 JF (volume shocks)",
  assetClass: "us_stock",
  timeframe: "1d",
  holdBars: 20,
  params: { window: 252, volMult: 2, volWindow: 50, holdBars: 20 },
};

export function signal(bars, i, ctx) {
  const { window, volMult, volWindow } = ctx.params;
  if (i < window) return 0;
  let mx = -Infinity;
  for (let k = i - window; k <= i - 1; k++) if (bars[k].close > mx) mx = bars[k].close;
  if (!(bars[i].close > mx)) return 0;
  let s = 0;
  for (let k = i - volWindow; k <= i - 1; k++) s += bars[k].volume;
  return bars[i].volume >= volMult * (s / volWindow) ? 1 : 0;
}
