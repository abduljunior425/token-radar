# Token Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/abduljunior425/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/abduljunior425/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: pre-token protocols ranked by implied value, from a sealed
DefiLlama snapshot. An entry for the make.fun bounty `token-radar-01`.

## What it does

`main.ts` (Node 22, standard library only) reads the sealed snapshot, scores every
pre-token protocol with the radar-2 model in `lib/model.ts`, and writes the ranked
board to `board.json`. The board covers the whole watchlist (every protocol with at
least $50M TVL and no token on record) plus every rankable pre-token protocol below
that floor. Live-token protocols are set aside with their market caps shown.

`dashboard/` is a static page with no network: search, category and chain filters,
a watchlist-only toggle, sortable columns, a top-three podium, a per-protocol detail
view with the model's own breakdown, and a seven-step farm plan per protocol.

## Model (radar-2)

```
implied = round( tvl_usd x 0.25 x growth x maturity x chains )
growth  = 1 + clamp(change_7d, -60, 120) / 100 x 0.6 when up, x 0.9 when down
maturity = 0.6 + min(age_days, 730) / 730 x 0.4
chains  = 1 + min(chains - 1, 4) x 0.05
```

A fall in TVL weighs more than a rise of the same size; each extra chain adds five
percent, up to four. Age is the time since the protocol was first listed; an unlisted
age uses 365 days. No protocol name is special-cased.

## Run it

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json|directory>
```

Inside the grader's container the input is `/input/snapshot.json` and the output is
`/output`. The run writes `board.json`, `data.js`, `dashboard/`, `screenshots/` and
`dossier.json`. Run it twice and the bytes are identical.

Implied value is this radar's own claim from the snapshot's figures: it is not a
price, a prediction that a token will launch, or a promise of an airdrop. A protocol
"records no token" when the snapshot carries no market cap, CoinGecko id or symbol
for it; that is the record, not proof it has none.
