// prereg-2026-09-25 B6: BTC plus the 6 alts with the lowest 90-session beta to BTC, equal weight
// (1/7 each), monthly. The literature prior is null (no beta premium in crypto).
export const meta = {
  id: "r25-crypto-btcbeta-low",
  name: "Crypto low BTC-beta alts plus BTC, monthly",
  family: "equity-factors",
  source: "Frazzini & Pedersen 2014 JFE (betting against beta); Liu, Tsyvinski & Wu 2022 JF report no crypto beta premium",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "monthly",
  params: { need: 92, lag: 2, minNames: 8, window: 90, alts: 6 },
};

function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}
function order(rows, desc) {
  return rows.sort((a, b) => (desc ? b[1] - a[1] : a[1] - b[1]) || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

export function rank(universe, t, ctx) {
  const { need, lag, minNames, window, alts } = ctx.params;
  const btc = universe.BTCUSDT;
  if (!btc || btc.length < need) return ew(universe);
  const rets = (b) => {
    const e = b.length - lag;
    const r = [];
    for (let k = e - window + 1; k <= e; k++) r.push(b[k].close / b[k - 1].close - 1);
    return r;
  };
  const m = rets(btc);
  const mm = m.reduce((p, q) => p + q, 0) / window;
  const vm = m.reduce((p, q) => p + (q - mm) ** 2, 0);
  if (!(vm > 0)) return ew(universe);
  const rows = [];
  for (const sym of Object.keys(universe)) {
    if (sym === "BTCUSDT") continue;
    const b = universe[sym];
    if (b.length < need) continue;
    const r = rets(b);
    const mr = r.reduce((p, q) => p + q, 0) / window;
    let c = 0;
    for (let j = 0; j < window; j++) c += (r[j] - mr) * (m[j] - mm);
    if (Number.isFinite(c)) rows.push([sym, c / vm]);
  }
  if (rows.length + 1 < minNames || rows.length < alts) return ew(universe);
  const out = { BTCUSDT: 1 / (alts + 1) };
  for (const [sym] of order(rows, false).slice(0, alts)) out[sym] = 1 / (alts + 1);
  return out;
}
