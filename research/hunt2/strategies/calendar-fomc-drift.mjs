// FOMC announcement drift. Source: Lucca & Moench 2015 J. Finance; EDGE RESEARCH.md §30.
// SPY is holdout -> INDEX_PROXY rule: trade QQQ instead.
// FOMC statement (decision-day) dates 2016-2025, source: federalreserve.gov FOMC meeting calendars
// (scraped once, hardcoded per README exception for fixed calendars).
const FOMC_DATES = [
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
];
const FOMC_SET = new Set(FOMC_DATES);

function ymd(time) {
  const d = new Date(time * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const meta = {
  id: "calendar-fomc-drift",
  name: "FOMC announcement drift",
  family: "seasonality",
  source: "Lucca & Moench 2015 J. Finance; EDGE RESEARCH.md §30 follow-up note",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ"],
  proxyFor: { SPY: "QQQ" },
  params: {},
};

// Long from close of the day before each FOMC statement day through close of the statement day.
// bars[i] is "the day before" iff bars[i+1] would be the FOMC day — but we can't look ahead,
// so instead: bars[i] is the FOMC day itself means we should have been long INTO this close,
// i.e. signal(i-1) = 1. Equivalently: hold position 1 for bar i if the NEXT calendar day (i+1's
// date, unknown) is an FOMC day. Since we can't peek at bars[i+1], derive it from bars[i]'s own
// date instead: check whether tomorrow (bars[i].time + 1 day) is an FOMC date.
export function signal(bars, i, ctx) {
  const tomorrow = ymd(bars[i].time + 86400);
  return FOMC_SET.has(tomorrow) ? 1 : 0;
}
