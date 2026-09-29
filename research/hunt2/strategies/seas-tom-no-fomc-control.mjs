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

function dayNumber(ymd) {
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(5, 7));
  const d = Number(ymd.slice(8, 10));
  const yAdjusted = y - (m <= 2 ? 1 : 0);
  const era = Math.floor(yAdjusted / 400);
  const yoe = yAdjusted - era * 400;
  const mp = m + (m > 2 ? -3 : 9);
  const doy = Math.floor((153 * mp + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

const FOMC_DAYS = FOMC_DATES.map(dayNumber).sort((a, b) => a - b);
const MIN_DAY = dayNumber("2016-01-01");

// Howard Hinnant's civil_from_days: days-since-epoch -> {y, m, d}. No lookahead: uses only bar i's own time.
function civilFromDays(days) {
  const z = days + 719468;
  const era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  const yFinal = y + (m <= 2 ? 1 : 0);
  return { y: yFinal, m, d };
}

function daysInMonth(y, m) {
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const table = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return table[m - 1];
}

// weekday: days-since-epoch mod 7; day 0 (1970-01-01) was Thursday.
// wd: 0=Thu 1=Fri 2=Sat 3=Sun 4=Mon 5=Tue 6=Wed
function weekday(days) {
  return ((days % 7) + 7) % 7;
}

// Last TRADING day of the month for date {y,m}: last calendar day, pulled back off a weekend.
function lastTradingDayOfMonth(y, m, daysEpochOfDate1) {
  const dim = daysInMonth(y, m);
  let d = dim;
  let wd = weekday(daysEpochOfDate1 + (dim - 1));
  if (wd === 2) d -= 1; // Sat -> Fri
  else if (wd === 3) d -= 2; // Sun -> Fri
  return d;
}

function nearFOMC(days) {
  for (let i = 0; i < FOMC_DAYS.length; i++) {
    const delta = FOMC_DAYS[i] - days;
    if (delta > 5) return false;
    if (delta >= -5) return true;
  }
  return false;
}

export const meta = {
  id: "seas-tom-no-fomc-control",
  name: "Matched control: turn-of-month drift with NO overlapping FOMC announcement",
  family: "seasonality",
  source: "Matched naive control for seas-tom-fomc-overlap; same window, same assets, same costs",
  assetClass: "etf",
  assets: ["QQQ", "DIA"],
  proxyFor: { SPY: "QQQ" },
  timeframe: "1d",
  params: { fomcWindowDays: 5, tomFirstDays: 3, minDate: "2016-01-01" },
};

export function signal(bars, i, ctx) {
  const days = Math.floor(bars[i].time / 86400);
  if (days < MIN_DAY) return 0;
  const { y, m, d } = civilFromDays(days);
  const daysEpochOfDate1 = days - (d - 1); // days-since-epoch for day 1 of this month

  if (ctx.state.prevMonth === undefined) {
    ctx.state.prevMonth = m;
    ctx.state.tdCount = 1;
  } else if (m !== ctx.state.prevMonth) {
    ctx.state.prevMonth = m;
    ctx.state.tdCount = 1;
  } else {
    ctx.state.tdCount += 1;
  }

  const isFirst3TradingDays = ctx.state.tdCount <= 3;
  const isLastTradingDay = d === lastTradingDayOfMonth(y, m, daysEpochOfDate1);

  return isFirst3TradingDays || isLastTradingDay ? (nearFOMC(days) ? 0 : 1) : 0;
}
