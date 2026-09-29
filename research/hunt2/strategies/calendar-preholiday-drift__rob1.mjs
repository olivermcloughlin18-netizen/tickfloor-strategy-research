// Pre-holiday drift, OFF-BY-ONE FIX for adversarial-verify audit.
// Harness convention: r[i] (return of bar i, close[i-1]->close[i]) is earned by pos[i-1].
// To capture the PRE-HOLIDAY DAY's own return, pos must be 1 on the day BEFORE that date,
// not on the date itself (which is what the original file did, capturing the day-AFTER-holiday
// return instead). This variant fires one trading day earlier, computed by hand (same fixed
// calendar, so allowed under the README hard-coded-constants exception).
// SPY holdout -> QQQ proxy (INDEX_PROXY rule), same as original.
export const meta = {
  id: "calendar-preholiday-drift__rob1",
  name: "Pre-holiday drift (off-by-one fixed)",
  family: "seasonality",
  source: "Ariel 1990 J. Finance; Lakonishok & Smidt 1988",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ"],
  proxyFor: { SPY: "QQQ" },
  params: {},
};

// One trading day before each date in the original PRE_HOLIDAY_DATES set (previous business day,
// weekend-adjusted). Firing signal here means pos is held during the pre-holiday session itself.
const SIGNAL_DATES = new Set([
  "2016-09-01", "2016-11-22", "2016-12-22",
  "2017-01-12", "2017-02-16", "2017-04-12", "2017-05-25", "2017-06-30", "2017-08-31", "2017-11-21", "2017-12-21",
  "2018-01-11", "2018-02-15", "2018-03-28", "2018-05-24", "2018-07-02", "2018-08-30", "2018-11-20", "2018-12-21",
  "2019-01-17", "2019-02-14", "2019-04-17", "2019-05-23", "2019-07-02", "2019-08-29", "2019-11-26", "2019-12-23",
  "2020-01-16", "2020-02-13", "2020-04-08", "2020-05-21", "2020-07-01", "2020-09-03", "2020-11-24", "2020-12-23",
  "2021-01-14", "2021-02-11", "2021-03-31", "2021-05-27", "2021-07-01", "2021-09-02", "2021-11-23", "2021-12-22",
  "2021-12-29",
  "2022-01-13", "2022-02-17", "2022-04-13", "2022-05-26", "2022-06-30", "2022-09-01", "2022-11-22", "2022-12-22",
  "2022-12-29",
  "2023-01-12", "2023-02-16", "2023-04-05", "2023-05-25", "2023-06-30", "2023-08-31", "2023-11-21", "2023-12-21",
  "2023-12-28",
  "2024-01-11", "2024-02-15", "2024-03-27", "2024-05-23", "2024-07-02", "2024-08-29", "2024-11-26", "2024-12-23",
  "2024-12-30",
  "2025-01-16", "2025-02-13",
]);

export function signal(bars, i, ctx) {
  const d = new Date(bars[i].time * 1000).toISOString().slice(0, 10);
  return SIGNAL_DATES.has(d) ? 1 : 0;
}
