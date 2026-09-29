export const meta = {
  id: "s29-cx-altseason-index",
  name: "Altcoin Season Index regime switch",
  family: "momentum",
  source: "blockchaincenter.net Altcoin Season Index (75% of alts beating BTC over 90 days = alt season, 25% = BTC season)",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "weekly",
  params: { window: 90, altOn: 0.75, btcOn: 0.25 },
};

export function rank(universe, t, ctx) {
  const p = ctx.params, st = ctx.state;
  if (st.regime === undefined) st.regime = "BTC";
  const btc = universe["BTCUSDT"];
  const alts = [];
  let A = null;
  if (btc && btc.length >= p.window + 1) {
    const bR = btc[btc.length - 1].close / btc[btc.length - 1 - p.window].close;
    let wins = 0;
    for (const s of Object.keys(universe)) {
      if (s === "BTCUSDT") continue;
      const b = universe[s];
      if (b.length < p.window + 1) continue;
      alts.push(s);
      if (b[b.length - 1].close / b[b.length - 1 - p.window].close > bR) wins++;
    }
    if (alts.length) A = wins / alts.length;
  }
  if (A !== null) {
    if (A >= p.altOn) st.regime = "ALT";
    else if (A <= p.btcOn) st.regime = "BTC";
  }
  const w = {};
  if (st.regime === "ALT" && alts.length) { for (const s of alts) w[s] = 1 / alts.length; }
  else if (btc) w["BTCUSDT"] = 1;
  return w;
}
