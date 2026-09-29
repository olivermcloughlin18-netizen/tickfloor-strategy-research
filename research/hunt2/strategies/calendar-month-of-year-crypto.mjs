// Month-of-year BTC seasonality ("Uptober"). Long BTC only in Oct/Nov/Apr, flat otherwise.
// Source: retail/crypto-media seasonality claims (CoinGlass monthly return tables).
export const meta = {
  id: "calendar-month-of-year-crypto",
  name: "Month-of-year crypto seasonality (Uptober)",
  family: "seasonality",
  source: "Retail/crypto-media seasonality claims (e.g. CoinGlass monthly return tables)",
  assetClass: "crypto",
  timeframe: "1d",
  assets: ["BTCUSDT"],
  params: { months: [4, 10, 11] }, // Apr, Oct, Nov - fixed before running, not tuned
};

// civil_from_days (Howard Hinnant's algorithm, days since 1970-01-01 UTC -> {y,m,d}), plain arithmetic only.
function monthFromEpochSeconds(t) {
  const z = Math.floor(t / 86400) + 719468;
  const era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const m = mp + (mp < 10 ? 3 : -9);
  return m;
}

export function signal(bars, i, ctx) {
  const m = monthFromEpochSeconds(bars[i].time);
  return ctx.params.months.includes(m) ? 1 : 0;
}
