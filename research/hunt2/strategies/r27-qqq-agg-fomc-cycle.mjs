// FOMC week parity. Source: Cieslak, Morse & Vissing-Jorgensen 2019 JF "Stock returns over the
// FOMC cycle" (equity premium is earned in even weeks 0, 2, 4, 6 of the ~6-8 week cycle counted
// from the day before each FOMC statement). Long QQQ in even weeks, AGG in odd weeks.
// Only 2016+ FOMC dates are verified in this repo, so 2005-2015 (D before 2016-01-26) is held
// at the 50/50 neutral mix, zero excess, disclosed. Cost: ~50 full switches/yr at 0.05%/side,
// roughly 5%/yr of drag.
//
// FOMC statement (decision-day) dates, copied byte for byte from calendar-fomc-drift.mjs, then
// with the unscheduled 2020-03-03 emergency inter-meeting cut removed (not a regular cycle date).
const FOMC_DATES = [
  "2016-01-27","2016-03-16","2016-04-27","2016-06-15","2016-07-27","2016-09-21","2016-11-02","2016-12-14",
  "2017-02-01","2017-03-15","2017-05-03","2017-06-14","2017-07-26","2017-09-20","2017-11-01","2017-12-13",
  "2018-01-31","2018-03-21","2018-05-02","2018-06-13","2018-08-01","2018-09-26","2018-11-08","2018-12-19",
  "2019-01-30","2019-03-20","2019-05-01","2019-06-19","2019-07-31","2019-09-18","2019-10-30","2019-12-11",
  "2020-01-29","2020-03-15","2020-04-29","2020-06-10","2020-07-29","2020-09-16","2020-11-05","2020-12-16",
  "2021-01-27","2021-03-17","2021-04-28","2021-06-16","2021-07-28","2021-09-22","2021-11-03","2021-12-15",
  "2022-01-26","2022-03-16","2022-05-04","2022-06-15","2022-07-27","2022-09-21","2022-11-02","2022-12-14",
  "2023-02-01","2023-03-22","2023-05-03","2023-06-14","2023-07-26","2023-09-20","2023-11-01","2023-12-13",
  "2024-01-31","2024-03-20","2024-05-01","2024-06-12","2024-07-31","2024-09-18","2024-11-07","2024-12-18",
  "2025-01-29","2025-03-19",
];

// day number x = Date.UTC(y, m-1, d) / 86400000
function dayNum(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
}

const FOMC_DAYS = FOMC_DATES.map(dayNum);
const NEUTRAL_DAY = dayNum("2016-01-26");

// x is a weekday iff ((x + 4) % 7) is 1..5 (epoch day 0 = 1970-01-01, a Thursday)
function isWeekday(x) {
  const w = ((x % 7) + 7 + 4) % 7;
  return w >= 1 && w <= 5;
}

// D = the first weekday after T
function firstWeekdayAfter(T) {
  let x = T + 1;
  while (!isWeekday(x)) x++;
  return x;
}

// wd(a, b) = count of weekdays x with a < x <= b
function wd(a, b) {
  let n = 0;
  for (let x = a + 1; x <= b; x++) if (isWeekday(x)) n++;
  return n;
}

export const meta = {
  id: "r27-qqq-agg-fomc-cycle",
  name: "QQQ in even FOMC-cycle weeks, AGG in odd weeks",
  family: "calendar",
  source: "Cieslak, Morse & Vissing-Jorgensen 2019 JF 'Stock returns over the FOMC cycle' (the equity premium is earned in even weeks 0, 2, 4, 6 of the cycle). Only 2016+ dates are verified in the repo, so 2005-2015 is held at the 50/50 benchmark mix (zero excess, disclosed). Cost: about 50 full switches a year at 0.05%/side, roughly 5%/yr of drag.",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "AGG"],
  rebalance: "daily",
  params: {},
};

// universe[SYM] = bars up to and including the rebalance day. t = the rebalance day's 00:00 UTC
// epoch seconds. Weights >= 0, sum to 1. Never return a weight for a symbol absent from universe.
export function rank(universe, t, ctx) {
  const keys = Object.keys(universe).sort();
  if (!Object.hasOwn(universe, "QQQ") || !Object.hasOwn(universe, "AGG")) {
    // EW present: a rule-named symbol is absent today.
    const w = {};
    for (const sym of keys) w[sym] = 1 / keys.length;
    return w;
  }

  const T = t / 86400;
  const D = firstWeekdayAfter(T);

  if (D < NEUTRAL_DAY) return { QQQ: 0.5, AGG: 0.5 };

  let week;
  let dn = -1;
  for (const f of FOMC_DAYS) if (f >= D) { dn = f; break; }
  if (dn !== -1 && wd(D, dn) === 1) {
    week = 0;
  } else {
    let dp = -1;
    for (const f of FOMC_DAYS) if (f <= D) dp = f;
    const k = D === dp ? 0 : wd(dp, D);
    week = k <= 3 ? 0 : 1 + Math.floor((k - 4) / 5);
  }

  return week % 2 === 0 ? { QQQ: 1 } : { AGG: 1 };
}
