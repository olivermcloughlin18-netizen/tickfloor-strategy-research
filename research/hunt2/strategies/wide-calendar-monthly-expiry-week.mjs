// Monthly options expiry week drift, proxied on QQQ (SPY is holdout).
export const meta = {
  id: "wide-calendar-monthly-expiry-week",
  name: "Monthly options expiry week drift (US equities, QQQ proxy) (wide US stocks)",
  family: "seasonality",
  source: "Stivers & Sun 2010 J. Banking & Finance; CBOE expiry-week studies",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",

  params: {},
};

// Howard Hinnant civil_from_days / days_from_civil, pure integer arithmetic.
function civilFromDays(z) {
  z += 719468;
  const era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return { y: y + (m <= 2 ? 1 : 0), m, d };
}
function daysFromCivil(y, m, d) {
  const yy = y - (m <= 2 ? 1 : 0);
  const era = Math.floor((yy >= 0 ? yy : yy - 399) / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}
// third-Friday-of-month days-since-epoch, and the Monday of that week.
function expiryWeekBounds(y, m) {
  const day1 = daysFromCivil(y, m, 1);
  const wd = ((day1 + 4) % 7 + 7) % 7; // 0=Sun..5=Fri..6=Sat
  const firstFridayDom = 1 + ((5 - wd + 7) % 7);
  const thirdFridayDom = firstFridayDom + 14;
  const thirdFridayDays = daysFromCivil(y, m, thirdFridayDom);
  return { mon: thirdFridayDays - 4, fri: thirdFridayDays };
}

export function signal(bars, i, ctx) {
  const days = Math.floor(bars[i].time / 86400);
  const { y, m } = civilFromDays(days);
  const { mon, fri } = expiryWeekBounds(y, m);
  return days >= mon && days <= fri ? 1 : 0;
}
