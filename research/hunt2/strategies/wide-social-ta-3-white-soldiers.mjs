// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "wide-social-ta-3-white-soldiers",
  name: "Three white soldiers / three black crows candlestick pattern (wide US stocks)",
  family: "social-ta",
  source: "TikTok/Instagram candlestick-pattern reels; Bulkowski pattern stats as academic baseline",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",
  longShort: true,
  params: { atrPeriod: 14, minBodyRatio: 0.5, holdBars: 5 },
};

function getAtr(bars, i) {
  let sum = 0;
  const start = i >= 13 ? i - 13 : 0;
  for (let k = start; k <= i; k++) {
    const h = bars[k].high;
    const l = bars[k].low;
    const cp = k === 0 ? bars[k].close : bars[k - 1].close;
    const tr = Math.max(h - l, Math.abs(h - cp), Math.abs(l - cp));
    sum = sum + tr;
  }
  return sum / (i - start + 1);
}

function isWhitePattern(bars, i) {
  const a = getAtr(bars, i);
  const b2 = bars[i - 2];
  const b1 = bars[i - 1];
  const b0 = bars[i];

  if (!(b0.close > b1.close && b1.close > b2.close)) return false;

  const body1High = Math.max(b2.open, b2.close);
  const body1Low = Math.min(b2.open, b2.close);
  if (!(b1.open >= body1Low && b1.open <= body1High)) return false;

  const body2High = Math.max(b1.open, b1.close);
  const body2Low = Math.min(b1.open, b1.close);
  if (!(b0.open >= body2Low && b0.open <= body2High)) return false;

  const b0body = b0.close - b0.open;
  const b1body = b1.close - b1.open;
  const b2body = b2.close - b2.open;
  const minBody = 0.5 * a;

  if (!(b0body > minBody && b1body > minBody && b2body > minBody)) return false;

  return true;
}

function isBlackPattern(bars, i) {
  const a = getAtr(bars, i);
  const b2 = bars[i - 2];
  const b1 = bars[i - 1];
  const b0 = bars[i];

  if (!(b0.close < b1.close && b1.close < b2.close)) return false;

  const body1High = Math.max(b2.open, b2.close);
  const body1Low = Math.min(b2.open, b2.close);
  if (!(b1.open >= body1Low && b1.open <= body1High)) return false;

  const body2High = Math.max(b1.open, b1.close);
  const body2Low = Math.min(b1.open, b1.close);
  if (!(b0.open >= body2Low && b0.open <= body2High)) return false;

  const b0body = Math.abs(b0.close - b0.open);
  const b1body = Math.abs(b1.close - b1.open);
  const b2body = Math.abs(b2.close - b2.open);
  const minBody = 0.5 * a;

  if (!(b0body > minBody && b1body > minBody && b2body > minBody)) return false;

  return true;
}

export function signal(bars, i, ctx) {
  if (i < 3) return 0;

  if (!ctx.state) {
    ctx.state = {};
  }

  let pos = ctx.state.pos || 0;
  const entry = ctx.state.entry || -1;

  if (pos !== 0) {
    const held = i - entry;
    if (held >= 5) {
      pos = 0;
      ctx.state.pos = 0;
      return 0;
    }
    return pos;
  }

  if (isWhitePattern(bars, i)) {
    ctx.state.pos = 1;
    ctx.state.entry = i;
    ctx.state.price = bars[i].close;
    return 1;
  }

  if (isBlackPattern(bars, i)) {
    ctx.state.pos = -1;
    ctx.state.entry = i;
    ctx.state.price = bars[i].close;
    return -1;
  }

  return 0;
}
