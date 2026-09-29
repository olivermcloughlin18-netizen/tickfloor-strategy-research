// ROBUSTNESS VARIANT rob2: different available proxy universe (DIA, the Dow
// Jones ETF, instead of QQQ) for the same 5+2 window, chosen a priori per the
// README's INDEX_PROXY rule which allows either QQQ or DIA as an SPY proxy.
// Santa Claus rally: long the last 5 trading days of December through the
// first 2 trading days of January, flat otherwise, every year.
// Source: Yale Hirsch, Stock Trader's Almanac.
// INDEX_PROXY: catalogue rule names SPY (holdout) -> trade DIA instead.
//
// Trading-day/holiday determination is pure calendar arithmetic (weekday +
// fixed US market holiday observance rules for New Year's Day and Christmas,
// the only two holidays that ever fall in December or January), not derived
// from price data or future bars, so it carries no lookahead.

export const meta = {
  id: "wide-calendar-santa-claus-rally__rob2",
  name: "Santa Claus rally rob2 (DIA proxy instead of QQQ) (wide US stocks)",
  family: "seasonality",
  source: "Stock Trader's Almanac (Yale Hirsch)",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",

  params: {},
};

// Howard Hinnant's days-from-civil (pure integer arithmetic).
function daysFromCivil(y, m, d) {
  y -= m <= 2 ? 1 : 0;
  const era = Math.floor((y >= 0 ? y : y - 399) / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function dow(y, m, d) {
  // 1970-01-01 (epoch day 0) was a Thursday = 4.
  const days = daysFromCivil(y, m, d);
  return ((days % 7) + 4 + 7) % 7; // 0=Sun..6=Sat
}

function isWeekend(y, m, d) {
  const w = dow(y, m, d);
  return w === 0 || w === 6;
}

// Observed-holiday check, Dec/Jan only (the only months relevant here).
function isObservedHoliday(y, m, d) {
  if (m === 12 && (d === 25 || (dow(y, 12, 25) === 6 && d === 24) || (dow(y, 12, 25) === 0 && d === 26))) {
    return true; // Christmas, observed
  }
  if (m === 1 && (d === 1 || (dow(y, 1, 1) === 0 && d === 2))) {
    return true; // New Year's Day, observed (Sat-Jan1 observance falls in prior Dec, irrelevant here)
  }
  return false;
}

function isTradingDay(y, m, d) {
  return !isWeekend(y, m, d) && !isObservedHoliday(y, m, d);
}

function getDate(timeSec) {
  const days = Math.floor(timeSec / 86400);
  // civil_from_days (Hinnant), inverse of daysFromCivil.
  const z = days + 719468;
  const era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return { y: m <= 2 ? y + 1 : y, m, d };
}

export function signal(bars, i, ctx) {
  const { y, m, d } = getDate(bars[i].time);

  if (m === 12) {
    // is d one of the last 5 trading days of December y?
    let count = 0;
    for (let dd = 31; dd >= 1; dd--) {
      if (isTradingDay(y, 12, dd)) {
        count++;
        if (dd === d) return count <= 5 ? 1 : 0;
      }
      if (count >= 5 && dd < d) break;
    }
    return 0;
  }

  if (m === 1) {
    // is d one of the first 2 trading days of January y?
    let count = 0;
    for (let dd = 1; dd <= 31; dd++) {
      if (isTradingDay(y, 1, dd)) {
        count++;
        if (dd === d) return count <= 2 ? 1 : 0;
      }
      if (count >= 2 && dd > d) break;
    }
    return 0;
  }

  return 0;
}
