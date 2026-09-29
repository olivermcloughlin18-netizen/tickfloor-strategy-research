// Crypto month-end/turn-of-month rebalancing flow: long the last trading day
// of the calendar month plus the first 3 days of the next month (index/ETF
// rebalancing + payroll-driven inflow theory). Equity turn-of-month is
// already tested and refuted (RESEARCH.md); crypto has no such passive-fund
// rebalancing flow, so this asks whether the effect shows up anyway.
export const meta = {
  id: "calendar-crypto-month-end-rebalance",
  name: "Crypto turn-of-month drift",
  family: "calendar",
  source: "Lakonishok & Smidt 1988 RFS turn-of-month, tested here for the crypto-specific absence of the equity mechanism",
  assetClass: "crypto",
  timeframe: "1d",
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
function daysInMonth(y, m) {
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const table = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return table[m - 1];
}

export function signal(bars, i, ctx) {
  const days = Math.floor(bars[i].time / 86400);
  const { y, m, d } = civilFromDays(days);
  if (ctx.state.prevMonth === undefined || m !== ctx.state.prevMonth) {
    ctx.state.prevMonth = m;
    ctx.state.tdCount = 1;
  } else {
    ctx.state.tdCount += 1;
  }
  const isLastCalDay = d === daysInMonth(y, m); // crypto trades every day, no weekend pull-back needed
  const isFirst3 = ctx.state.tdCount <= 3;
  return isLastCalDay || isFirst3 ? 1 : 0;
}
