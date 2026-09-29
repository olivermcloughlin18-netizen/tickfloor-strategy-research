// r27-cx-volume-confirm: exit on a 28-bar close breakdown, re-enter only when price
// reclaims the 28-bar high AND short-term volume (28) exceeds long-term volume (90).
// Lee & Swaminathan 2000 JF (volume and momentum); Bianchi, Babiak & Dickerson 2022 JBF
// (trading volume and cryptocurrency returns); Granville 1963.

export const meta = {
  id: "r27-cx-volume-confirm",
  name: "Crypto 4-week trend with volume-confirmed re-entry",
  family: "trend",
  source: "Lee & Swaminathan 2000 JF (volume and momentum); Bianchi, Babiak & Dickerson 2022 JBF (trading volume and cryptocurrency returns); Granville 1963",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  params: { lookback: 28, volShort: 28, volLong: 90 },
};

export function signal(bars, i, ctx) {
  const { lookback, volShort, volLong } = ctx.params;
  if (ctx.state.pos === undefined) ctx.state.pos = 1;

  if (i < 90) return 1;

  const c = bars[i].close;
  const cLag = bars[i - lookback].close;
  if (ctx.state.pos === 1 && c <= cLag) {
    ctx.state.pos = 0;
  } else if (
    ctx.state.pos === 0 &&
    c > cLag &&
    ctx.sma("volume", volShort, i) > ctx.sma("volume", volLong, i)
  ) {
    ctx.state.pos = 1;
  }
  return ctx.state.pos;
}
