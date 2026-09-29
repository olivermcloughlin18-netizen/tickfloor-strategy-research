// prereg-2026-09-25 control: r25-eap-volume shifted 21 sessions earlier (names that announced LAST
// month a year ago, i.e. not about to announce): window 252-272 sessions ago, otherwise identical.
// volume >= 3x its prior-50-session median AND an absolute return >= 2%. Hold all predicted
// announcers equal weight (>= 10 of them), otherwise equal weight on everything.
export const meta = {
  id: "r25-ctrl-eap-lastyear",
  name: "Control: volume-seasonal announcers shifted one month back (wide US stocks)",
  family: "deep-validation-control",
  source: "Preregistered mechanism control for r25-eap-volume",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 326, lag: 2, minNames: 50, from: 272, to: 252, base: 50, volX: 3, absRet: 0.02, minHold: 10 },
};

function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}
function median(xs) {
  const s = xs.slice().sort((a, b) => a - b);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
}

export function rank(universe, t, ctx) {
  const { need, lag, minNames, from, to, base, volX, absRet, minHold } = ctx.params;
  let M = 0;
  const ann = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < need) continue;
    const e = b.length - lag;
    M++;
    for (let k = e - from; k <= e - to; k++) {
      const vols = [];
      for (let j = k - base; j < k; j++) vols.push(b[j].volume);
      const med = median(vols);
      if (med > 0 && b[k].volume / med >= volX && Math.abs(b[k].close / b[k - 1].close - 1) >= absRet) {
        ann.push(sym);
        break;
      }
    }
  }
  if (M < minNames || ann.length < minHold) return ew(universe);
  const out = {};
  for (const sym of ann) out[sym] = 1 / ann.length;
  return out;
}
