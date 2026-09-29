export const meta = {
  id: "trader-books-raschke-holy-grail",
  name: "Raschke Holy Grail pullback-to-20ma",
  family: "trader-books",
  source: "Linda Raschke Holy Grail setup",
  assetClass: "us_stock",
  timeframe: "1d",
  longShort: true,
  params: { emaLen: 20, adxLen: 14 },
};

export function signal(bars, i, ctx) {
  const { emaLen, adxLen } = ctx.params;

  // Ensure state exists and is initialized
  if (typeof ctx.state === 'undefined' || ctx.state === null) {
    ctx.state = {};
  }

  if (!ctx.state.emas) ctx.state.emas = [];
  if (!ctx.state.trValues) ctx.state.trValues = [];
  if (!ctx.state.dmPlusValues) ctx.state.dmPlusValues = [];
  if (!ctx.state.dmMinusValues) ctx.state.dmMinusValues = [];
  if (!ctx.state.diPlusValues) ctx.state.diPlusValues = [];
  if (!ctx.state.diMinusValues) ctx.state.diMinusValues = [];
  if (!ctx.state.adxValues) ctx.state.adxValues = [];
  if (!ctx.state.trSmoothHistory) ctx.state.trSmoothHistory = [];
  if (!ctx.state.dmPlusSmoothHistory) ctx.state.dmPlusSmoothHistory = [];
  if (!ctx.state.dmMinusSmoothHistory) ctx.state.dmMinusSmoothHistory = [];

  const state = ctx.state;

  // Compute 20-period EMA
  let ema20 = bars[i].close;
  if (i > 0 && i < emaLen) {
    let sum = 0;
    for (let k = 0; k <= i; k++) sum += bars[k].close;
    ema20 = sum / (i + 1);
  } else if (i >= emaLen) {
    const alpha = 2 / (emaLen + 1);
    if (state.emas.length === 0) {
      let sum = 0;
      for (let k = 0; k < emaLen; k++) sum += bars[k].close;
      ema20 = sum / emaLen;
    } else {
      ema20 = alpha * bars[i].close + (1 - alpha) * state.emas[state.emas.length - 1];
    }
  }
  state.emas.push(ema20);

  // Compute True Range
  let tr = bars[i].high - bars[i].low;
  if (i > 0) {
    const pc = bars[i - 1].close;
    tr = Math.max(tr, Math.abs(bars[i].high - pc), Math.abs(bars[i].low - pc));
  }
  state.trValues.push(tr);

  // Compute Directional Movements
  let dmPlus = 0;
  let dmMinus = 0;
  if (i > 0) {
    const upMove = bars[i].high - bars[i - 1].high;
    const downMove = bars[i - 1].low - bars[i].low;
    if (upMove > 0 && upMove > downMove) dmPlus = upMove;
    if (downMove > 0 && downMove > upMove) dmMinus = downMove;
  }
  state.dmPlusValues.push(dmPlus);
  state.dmMinusValues.push(dmMinus);

  // Compute smoothed TR, DM+ and DM- (Wilder's smoothing)
  const alpha = 1 / adxLen;
  let trSmoothed = 0;
  let dmPlusSmoothed = 0;
  let dmMinusSmoothed = 0;

  if (i + 1 < adxLen) {
    for (let k = 0; k <= i; k++) {
      trSmoothed += state.trValues[k];
      dmPlusSmoothed += state.dmPlusValues[k];
      dmMinusSmoothed += state.dmMinusValues[k];
    }
  } else if (i + 1 === adxLen) {
    for (let k = 0; k < adxLen; k++) {
      trSmoothed += state.trValues[k];
      dmPlusSmoothed += state.dmPlusValues[k];
      dmMinusSmoothed += state.dmMinusValues[k];
    }
  } else {
    const prevTr = state.trSmoothHistory[state.trSmoothHistory.length - 1] || 0;
    const prevDmPlus = state.dmPlusSmoothHistory[state.dmPlusSmoothHistory.length - 1] || 0;
    const prevDmMinus = state.dmMinusSmoothHistory[state.dmMinusSmoothHistory.length - 1] || 0;
    trSmoothed = prevTr * (1 - alpha) + tr * alpha;
    dmPlusSmoothed = prevDmPlus * (1 - alpha) + dmPlus * alpha;
    dmMinusSmoothed = prevDmMinus * (1 - alpha) + dmMinus * alpha;
  }

  state.trSmoothHistory.push(trSmoothed);
  state.dmPlusSmoothHistory.push(dmPlusSmoothed);
  state.dmMinusSmoothHistory.push(dmMinusSmoothed);

  // Compute +DI and -DI
  let diPlus = 0;
  let diMinus = 0;
  if (trSmoothed > 0) {
    diPlus = (dmPlusSmoothed / trSmoothed) * 100;
    diMinus = (dmMinusSmoothed / trSmoothed) * 100;
  }
  state.diPlusValues.push(diPlus);
  state.diMinusValues.push(diMinus);

  // Compute ADX
  let adx = 0;
  if (state.diPlusValues.length >= adxLen) {
    const diDiff = Math.abs(diPlus - diMinus);
    const diSum = diPlus + diMinus;
    const di = diSum > 0 ? (diDiff / diSum) * 100 : 0;

    if (state.adxValues.length === 0) {
      let sumDi = 0;
      const startIdx = state.diPlusValues.length - adxLen;
      for (let k = startIdx; k < state.diPlusValues.length; k++) {
        const d = Math.abs(state.diPlusValues[k] - state.diMinusValues[k]);
        const s = state.diPlusValues[k] + state.diMinusValues[k];
        if (s > 0) sumDi += (d / s) * 100;
      }
      adx = sumDi / adxLen;
    } else {
      const prevAdx = state.adxValues[state.adxValues.length - 1];
      adx = prevAdx * (1 - alpha) + di * alpha;
    }
  }
  state.adxValues.push(adx);

  // Signal logic
  if (state.adxValues.length < 3) return 0;

  const currAdx = state.adxValues[state.adxValues.length - 1];
  const prevAdx = state.adxValues[state.adxValues.length - 2];
  const prev2Adx = state.adxValues[state.adxValues.length - 3];

  if (currAdx <= 30 || !(currAdx > prevAdx && prevAdx > prev2Adx)) return 0;

  const isUptrend = diPlus > diMinus;
  const isDowntrend = diMinus > diPlus;

  if (isUptrend && bars[i].low <= ema20 && bars[i].close > ema20) return 1;
  if (isDowntrend && bars[i].high >= ema20 && bars[i].close < ema20) return -1;

  return 0;
}
