// Overnight gap fade on equity index ETF proxy (SPY -> QQQ/DIA, INDEX_PROXY rule).
// Gap% = (today open - yesterday close)/yesterday close. Big gap up -> fade short;
// big gap down -> fade long. This harness only settles close-to-close returns, so
// the fade is realised over the close(i)->close(i+1) leg that follows the gap day
// (same convention used by event-pead-price-gap.mjs for intraday-gap signals).
// FOMC days are skipped (no scheduled-macro-event gaps), per source:
// https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
export const meta = {
  id: "wide-mrsa-gap-fade-equity-index",
  name: "Overnight gap fade on equity index ETF (QQQ/DIA proxy) (wide US stocks)",
  family: "mean_reversion",
  source: "Connors gap-trading research; Quantpedia 'Overnight Gap Reversal'",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",

  longShort: true,
  params: { gapThreshold: 0.015 },
};

// FOMC statement-release dates 2016-2025, UTC date string YYYY-MM-DD.
const FOMC_DAYS = new Set([
  "2016-01-27","2016-03-16","2016-04-27","2016-06-15","2016-07-27","2016-09-21","2016-11-02","2016-12-14",
  "2017-02-01","2017-03-15","2017-05-03","2017-06-14","2017-07-26","2017-09-20","2017-11-01","2017-12-13",
  "2018-01-31","2018-03-21","2018-05-02","2018-06-13","2018-08-01","2018-09-26","2018-11-08","2018-12-19",
  "2019-01-30","2019-03-20","2019-05-01","2019-06-19","2019-07-31","2019-09-18","2019-10-30","2019-12-11",
  "2020-01-29","2020-03-03","2020-03-15","2020-04-29","2020-06-10","2020-07-29","2020-09-16","2020-11-05","2020-12-16",
  "2021-01-27","2021-03-17","2021-04-28","2021-06-16","2021-07-28","2021-09-22","2021-11-03","2021-12-15",
  "2022-01-26","2022-03-16","2022-05-04","2022-06-15","2022-07-27","2022-09-21","2022-11-02","2022-12-14",
  "2023-02-01","2023-03-22","2023-05-03","2023-06-14","2023-07-26","2023-09-20","2023-11-01","2023-12-13",
  "2024-01-31","2024-03-20","2024-05-01","2024-06-12","2024-07-31","2024-09-18","2024-11-07","2024-12-18",
  "2025-01-29","2025-03-19",
]);

function utcDateStr(sec) {
  const d = new Date(sec * 1000);
  return d.toISOString().slice(0, 10);
}

export function signal(bars, i, ctx) {
  if (i < 1) return 0;
  const today = bars[i];
  const prevClose = bars[i - 1].close;
  if (FOMC_DAYS.has(utcDateStr(today.time))) return 0;
  const gap = (today.open - prevClose) / prevClose;
  const t = ctx.params.gapThreshold;
  if (gap > t) return -1;   // gap up -> fade short
  if (gap < -t) return 1;   // gap down -> fade long
  return 0;
}
