// Turn-of-month equity drift. SPY is holdout -> QQQ proxy (INDEX_PROXY rule).
export const meta = {
  id: "wide-calendar-turn-of-month",
  name: "Turn-of-month equity drift (wide US stocks)",
  family: "calendar",
  source: "Lakonishok & Smidt 1988 RFS; McConnell & Xu 2008 FAJ",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",

  timeframe: "1d",
  params: {},
};

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

export function signal(bars, i, ctx) {
  const days = Math.floor(bars[i].time / 86400);
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

  return isFirst3TradingDays || isLastTradingDay ? 1 : 0;
}
