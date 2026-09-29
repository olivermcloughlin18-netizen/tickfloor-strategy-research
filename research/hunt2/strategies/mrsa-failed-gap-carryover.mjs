export const meta = {
  id: 'mrsa-failed-gap-carryover',
  name: 'Failed-gap carryover (intraday sign overrides overnight gap sign)',
  family: 'mean_reversion',
  source: 'Lane hypothesis: intraday-to-daily carryover; sign-conflict decomposition of the overnight gap vs the open-to-close session. Not in research/hunt2/catalogue.json.',
  assetClass: 'etf',
  timeframe: '1d',
  assets: ['QQQ', 'DIA', 'XLK', 'XLF', 'XLE', 'XLY'],
  longShort: true,
  params: { gapMin: 0.003 },
};

export function signal(bars, i, ctx) {
  if (i < 1) return 0;
  const prevClose = bars[i - 1].close, o = bars[i].open, c = bars[i].close;
  const gap = (o - prevClose) / prevClose;
  const day = (c - prevClose) / prevClose;
  const g = ctx.params.gapMin;
  if (gap > g && day < 0) return -1; // failed gap up -> intraday direction is down -> short
  if (gap < -g && day > 0) return 1; // failed gap down -> intraday direction is up -> long
  return 0;
}
