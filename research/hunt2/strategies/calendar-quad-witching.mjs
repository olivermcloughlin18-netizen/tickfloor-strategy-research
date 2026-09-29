// Quadruple-witching-day mean reversion: short QQQ into the close on the
// third Friday of Mar/Jun/Sep/Dec (options/futures expiry), flat otherwise,
// on the theory that unwind flow reverts the next session. SPY is holdout ->
// QQQ proxy (INDEX_PROXY rule).
export const meta = {
  id: "calendar-quad-witching",
  name: "Quadruple-witching-day reversal",
  family: "calendar",
  source: "Stoll & Whaley 1987 JFQA (expiration-day effects); popular retail folklore 2020s",
  assetClass: "etf",
  assets: ["QQQ"],
  proxyFor: { SPY: "QQQ" },
  timeframe: "1d",
  longShort: true,
  params: {},
};

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
// day 0 (1970-01-01) was Thursday. wd: 0=Thu 1=Fri 2=Sat 3=Sun 4=Mon 5=Tue 6=Wed
function weekday(days) { return ((days % 7) + 7) % 7; }
const isFri = (days) => weekday(days) === 1;

export function signal(bars, i, ctx) {
  const days = Math.floor(bars[i].time / 86400);
  const { m, d } = civilFromDays(days);
  if (![3, 6, 9, 12].includes(m)) return 0;
  if (!isFri(days)) return 0;
  // third Friday: d in [15, 21]
  if (d < 15 || d > 21) return 0;
  return -1; // short the witching-day close, expect reversion the next session
}
