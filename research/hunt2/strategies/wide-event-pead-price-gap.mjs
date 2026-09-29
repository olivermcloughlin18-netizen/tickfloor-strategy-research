export const meta = {
  id: "wide-event-pead-price-gap",
  name: "PEAD via earnings-day price gap proxy (wide US stocks)",
  family: "event-driven",
  source: "Chan, Jegadeesh & Lakonishok (1996) Journal of Finance",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "daily",
  longShort: true,
  params: { retThreshold: 0.05, volMultiplier: 2.0, lookback: 20 },
};

export function rank(universe, t, ctx) {
  const scores = [];
  const { retThreshold, volMultiplier, lookback } = ctx.params;

  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];
    if (bars.length < lookback + 1) continue;

    const today = bars[bars.length - 1];

    // 20-day average volume (excluding today)
    let volSum = 0;
    for (let k = bars.length - lookback - 1; k < bars.length - 1; k++) {
      volSum += bars[k].volume;
    }
    const avgVol = volSum / lookback;

    const ret = (today.close - today.open) / today.open;

    if (today.volume > volMultiplier * avgVol) {
      if (ret > retThreshold) {
        scores.push([sym, 1]);
      } else if (ret < -retThreshold) {
        scores.push([sym, -1]);
      }
    }
  }

  if (scores.length === 0) return {};

  const longs = scores.filter(s => s[1] > 0);
  const shorts = scores.filter(s => s[1] < 0);

  const w = {};

  if (longs.length > 0) {
    const wLong = 0.5 / longs.length;
    for (const [sym] of longs) w[sym] = wLong;
  }

  if (shorts.length > 0) {
    const wShort = -0.5 / shorts.length;
    for (const [sym] of shorts) w[sym] = wShort;
  }

  return w;
}
