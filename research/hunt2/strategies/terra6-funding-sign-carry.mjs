export const meta = {
  id: "terra6-funding-sign-carry",
  name: "Terra6 Funding Sign Carry",
  family: "carry",
  source: "Terra6 trailing 7-day perpetual funding-sign carry hypothesis",
  assetClass: "crypto",
  timeframe: "1d",
  params: { window: 7 },
};

export function signal(bars, i, ctx) {
  const f = ctx.fundingRate();
  if (f === null) return 0;
  if (ctx.state.buf === undefined) ctx.state.buf = [];
  ctx.state.buf.push(f);
  if (ctx.state.buf.length > 7) ctx.state.buf.shift();
  if (ctx.state.buf.length < 7) return 0;
  let sum = 0;
  for (let k = 0; k < 7; k++) sum += ctx.state.buf[k];
  return sum / 7 > 0 ? 1 : 0;
}
