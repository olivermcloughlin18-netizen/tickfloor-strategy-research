// Pre-holiday drift. SPY is holdout -> trade QQQ as proxy (INDEX_PROXY rule).
// Source: Ariel 1990 J. Finance; Lakonishok & Smidt 1988.
// Holiday dates + observed-shift rule: NYSE holiday calendar 2016-2025
// (New Year's, MLK, Presidents, Good Friday, Memorial, Independence, Labor,
// Thanksgiving, Christmas), hand-computed offline, hard-coded as constants
// per README exception for fixed calendars.

export const meta = {
  id: "wide-calendar-preholiday-drift",
  name: "Pre-holiday drift (wide US stocks)",
  family: "seasonality",
  source: "Ariel 1990 J. Finance; Lakonishok & Smidt 1988",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",

  params: {},
};

// Last trading session before each of the 9 US market holidays, 2016-09 through 2025-03-15
// (the discovery window). Computed by hand from the NYSE holiday calendar (weekend/observed shifts applied).
const PRE_HOLIDAY_DATES = new Set([
  "2016-09-02", "2016-11-23", "2016-12-23",
  "2017-01-13", "2017-02-17", "2017-04-13", "2017-05-26", "2017-07-03", "2017-09-01", "2017-11-22", "2017-12-22",
  "2018-01-12", "2018-02-16", "2018-03-29", "2018-05-25", "2018-07-03", "2018-08-31", "2018-11-21", "2018-12-24",
  "2019-01-18", "2019-02-15", "2019-04-18", "2019-05-24", "2019-07-03", "2019-08-30", "2019-11-27", "2019-12-24",
  "2020-01-17", "2020-02-14", "2020-04-09", "2020-05-22", "2020-07-02", "2020-09-04", "2020-11-25", "2020-12-24",
  "2021-01-15", "2021-02-12", "2021-04-01", "2021-05-28", "2021-07-02", "2021-09-03", "2021-11-24", "2021-12-23",
  "2021-12-30",
  "2022-01-14", "2022-02-18", "2022-04-14", "2022-05-27", "2022-07-01", "2022-09-02", "2022-11-23", "2022-12-23",
  "2022-12-30",
  "2023-01-13", "2023-02-17", "2023-04-06", "2023-05-26", "2023-07-03", "2023-09-01", "2023-11-22", "2023-12-22",
  "2023-12-29",
  "2024-01-12", "2024-02-16", "2024-03-28", "2024-05-24", "2024-07-03", "2024-08-30", "2024-11-27", "2024-12-24",
  "2024-12-31",
  "2025-01-17", "2025-02-14",
]);

export function signal(bars, i, ctx) {
  const d = new Date(bars[i].time * 1000).toISOString().slice(0, 10);
  return PRE_HOLIDAY_DATES.has(d) ? 1 : 0;
}
