# Token Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/abduljunior425/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/abduljunior425/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A radar for token launches that have not happened yet: pre-token protocols, ranked by
an implied value computed from a sealed DefiLlama snapshot. An entry for the make.fun
bounty [`token-radar-01`](https://make.fun/bounty/token-radar-01).

## What it does

`main.ts` runs on Node 22 with the standard library only. It reads the sealed
snapshot, scores every pre-token protocol with the radar-2 model in `lib/model.ts`,
and writes the ranked board to `board.json`. The board holds the entire watchlist —
every protocol with at least $50M of TVL and no token on record — plus every
rankable pre-token protocol below that floor. Protocols that already have a token are
kept apart, with their market caps shown as the market's own numbers.

`dashboard/` is a static page that makes no network requests: a search box, category
and chain filters, a watchlist-only toggle, sortable columns, a podium of the top
three, a detail view per protocol with the model's own breakdown, and a seven-step
farm plan for each protocol.

## Model (radar-2)

```
implied  = round( tvl_usd x 0.25 x growth x maturity x chains )
growth   = 1 + clamp(change_7d, -60, 120) / 100 x 0.6 when up, x 0.9 when down
maturity = 0.6 + min(age_days, 730) / 730 x 0.4
chains   = 1 + min(chains - 1, 4) x 0.05
```

A shrinking week counts against a protocol more than a growing week of the same size
counts for it. Each extra chain adds five percent, up to four chains. Age is the time
since the protocol was first listed; when no listing date is known, the model counts
365 days. No protocol name is special-cased — the same function scores every row.

## Run it

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json|directory>
```

Inside the grader's container the input is `/input/snapshot.json` and the output is
`/output`. One run writes `board.json`, `data.js`, `dashboard/`, `screenshots/` and
`dossier.json`. Run it twice and the bytes come out identical.

Implied value is this radar's own claim from the snapshot's figures: it is not a
price, not a prediction that a token will launch, and not a promise of an airdrop.
A protocol "records no token" when the snapshot carries no market cap, CoinGecko id
or symbol for it — that is the record, not proof that it has none.
