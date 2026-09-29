// Kaminski-Lo-style stop-loss on a 20-day momentum readout, long-only.
// Exit (go flat) when the trailing 20-day return breaches -20% (sized off maximum adverse
// excursion per u/Jorg4e, r/Daytrading 1wnxeh8); re-enter when the 20-day return turns positive.
export const meta = {
  id: "r27-cx-kl-stop",
  name: "Crypto 20% four-week stop-loss with trend re-entry",
  family: "trend",
  source: "u/Jorg4e, r/Daytrading 1wnxeh8 (size stops from maximum adverse excursion); Kaminski & Lo 2014 J. Financial Markets 'When do stop-loss rules stop losses?'",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  params: { window: 20, stop: 0.20 },
};

export function signal(bars, i, ctx) {
  if (ctx.state.pos === undefined) ctx.state.pos = 1;
  const { window, stop } = ctx.params;

  if (i < window) return 1;

  const r20 = bars[i].close / bars[i - window].close - 1;

  if (ctx.state.pos === 1 && r20 <= -stop) ctx.state.pos = 0;
  else if (ctx.state.pos === 0 && r20 > 0) ctx.state.pos = 1;

  return ctx.state.pos;
}
