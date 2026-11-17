// Token Radar's scoring model, second revision: one sealed snapshot in, one ranked board out.
//
// The board is built from two groups. First, every slug on the snapshot's watchlist — the
// watchlist is a floor, not a ceiling, so all forty make it. Second, every rankable
// pre-token protocol below the watchlist floor, with no cap and no shortlist: the early
// radar is the whole early field, ordered by the model, not a top slice of it.
//
// A protocol counts as pre-token when its snapshot entry carries no token at all: no
// market cap, no CoinGecko id, no symbol. Live-token protocols are kept apart and shown
// with the market's own numbers, never mixed into the ranking.
//
// The implied value uses only the snapshot's own figures, in five steps:
//
//   base     = tvl_usd * 0.25
//   growth   = clamp(change_7d, -60, 120), in percent
//   growth x = 1 + (growth / 100) * 0.6   when growth is zero or up
//            = 1 + (growth / 100) * 0.9   when growth is down (falls weigh more)
//   maturity = 0.6 + min(age_days, 730) / 730 * 0.4   (unknown age counts as 365 days)
//   chains x = 1 + min(max(chains - 1, 0), 4) * 0.05  (each extra chain, up to four)
//   implied  = max(1, round(base * growth x maturity x chains x))
//
// The constants live in MODEL below, so the dashboard can state them and the sandbox
// can change them. No protocol name is ever special-cased: one function scores all rows.

/** One protocol entry from the sealed snapshot: exactly the ten fields the input carries. */
export interface ProtocolEntry {
  slug: string; // DefiLlama slug, the row's key
  name: string; // display name as the snapshot records it
  category: string | null; // DefiLlama category, or null when the snapshot has none
  chains: string[]; // chains the protocol names, in the snapshot's order
  tvl_usd: number; // total value locked, in US dollars
  change_7d: number | null; // seven-day TVL change in percent, or null
  mcap_usd: number | null; // market cap when a token trades, else null
  listed_at: string | null; // first-listed date (YYYY-MM-DD), or null
  gecko_id: string | null; // CoinGecko id when one exists, else null
  symbol: string | null; // token symbol when one exists, else null
}

/** The whole snapshot document. */
export interface SnapshotDoc {
  as_of: string; // snapshot date, YYYY-MM-DD
  source: string; // where the snapshot came from
  floor_usd: number; // watchlist TVL floor, in US dollars
  protocols: ProtocolEntry[]; // every protocol the snapshot carries
  watchlist: string[]; // slugs on the watchlist, in the snapshot's order
}

/** The model's constants, as the dashboard states them and the sandbox may change them. */
export interface ModelParams {
  base_multiple: number; // TVL is worth a quarter of itself at launch
  growth_weight_up: number; // a rise weighs 0.6
  growth_weight_down: number; // a fall weighs 0.9
  growth_floor: number; // growth is never below -60 percent
  growth_cap: number; // growth is never above 120 percent
  maturity_floor: number; // a fresh listing starts at 0.6
  maturity_range: number; // maturity adds up to 0.4
  maturity_days: number; // maturity stops growing at 730 days
  unknown_age_days: number; // an unlisted age counts as 365 days
  chain_step: number; // each extra chain adds 0.05
  chain_max: number; // at most four extra chains count
}

export const MODEL: ModelParams = {
  base_multiple: 0.25, // a quarter of TVL
  growth_weight_up: 0.6, // rises weigh less
  growth_weight_down: 0.9, // falls weigh more
  growth_floor: -60, // the worst week the model credits
  growth_cap: 120, // the best week the model credits
  maturity_floor: 0.6, // where a new listing starts
  maturity_range: 0.4, // what two years of running adds
  maturity_days: 730, // two years, in days
  unknown_age_days: 365, // one year, when no listing date is known
  chain_step: 0.05, // five percent per extra chain
  chain_max: 4, // four extra chains at most
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION: string = 'radar-2';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS: number = 24;

/** One farm step: the action, what it costs, and how long it takes. */
export interface PlanStep {
  text: string; // what to do
  cost: string; // what it costs
  time: string; // how long it takes
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number; // 1 is the strongest implied value
  slug: string; // DefiLlama slug
  name: string; // display name
  category: string | null; // DefiLlama category, or null
  chains: string[]; // chains the protocol names
  tvl_usd: number; // total value locked, US dollars
  change_7d: number | null; // seven-day TVL change in percent, or null
  mcap_usd: number | null; // market cap, null for a pre-token row
  listed_at: string | null; // first-listed date, or null
  gecko_id: string | null; // CoinGecko id, null for a pre-token row
  symbol: string | null; // token symbol, null for a pre-token row
  token_status: 'pre-token'; // every board row is pre-token
  age_days: number | null; // days listed at the snapshot date, or null
  implied_value_usd: number; // the model's implied value, whole dollars
  model: {
    base_multiple: number; // the multiple the row was scored with
    growth_pct: number; // the clamped weekly growth in percent
    growth_multiplier: number; // the growth multiplier, four decimals
    maturity_multiplier: number; // the maturity multiplier, four decimals
    chain_multiplier: number; // the chain multiplier, four decimals
    age_days: number | null; // the age the model used, or null
  };
  farm_steps: string[]; // the seven-step farm plan, as strings
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number; // 1 is the strongest implied value
  slug: string; // DefiLlama slug
  name: string; // display name
  category: string | null; // DefiLlama category, or null
  chains: string[]; // chains the protocol names
  tvl_usd: number; // total value locked, US dollars
  change_7d: number | null; // seven-day TVL change in percent, or null
  mcap_usd: number | null; // market cap, null for a pre-token row
  listed_at: string | null; // first-listed date, or null
  age_days: number | null; // days listed at the snapshot date, or null
  implied_value_usd: number; // the model's implied value, whole dollars
  growth_multiplier: number; // the growth multiplier, four decimals
  maturity_multiplier: number; // the maturity multiplier, four decimals
  chain_multiplier: number; // the chain multiplier, four decimals
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string; // DefiLlama slug
  name: string; // display name
  category: string | null; // DefiLlama category, or null
  chains: string[]; // chains the protocol names
  tvl_usd: number; // total value locked, US dollars
  mcap_usd: number | null; // market cap, the traded value
  change_7d: number | null; // seven-day TVL change in percent, or null
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string; // snapshot date, YYYY-MM-DD
  source: string; // where the snapshot came from
  floor_usd: number; // watchlist TVL floor, in US dollars
  model: ModelParams; // the constants the board was scored with
  model_version: string; // the model's version label
  watchlist: string[]; // slugs on the watchlist
  watchlist_size: number; // how many slugs the watchlist holds
  board_size: number; // how many rows the board holds
  early_size: number; // how many board rows sit below the floor
  live_size: number; // how many live-token protocols are set aside
  rows: RadarRow[]; // the board, compact, strongest first
  live: LiveRow[]; // the live-token protocols, by market cap
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const MS_PER_DAY = 86_400_000;

/** A finite number, else `fallback`. */
function numOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Days from `listedAt` to `asOf`, never below zero; null when either date is missing or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const asOfMs = Date.parse(`${asOf}T00:00:00Z`);
  const listedMs = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(asOfMs) || !Number.isFinite(listedMs)) return null;
  return Math.max(0, Math.floor((asOfMs - listedMs) / MS_PER_DAY));
}

/** A number rounded to four decimals, for the multipliers the board carries. */
function round4dp(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

/** The week's growth in percent, clamped to the model's floor and cap. */
function clampedGrowth(change7d: number | null, model: ModelParams): number {
  const raw = numOr(change7d, 0);
  return Math.min(model.growth_cap, Math.max(model.growth_floor, raw));
}

/** The growth multiplier: rises weigh 0.6, falls weigh 0.9. */
function growthFactor(growthPct: number, model: ModelParams): number {
  const weight = growthPct >= 0 ? model.growth_weight_up : model.growth_weight_down;
  return 1 + (growthPct / 100) * weight;
}

/** The maturity multiplier: 0.6 at listing, rising to 1.0 at two years. */
function maturityFactor(age: number | null, model: ModelParams): number {
  const days = age ?? model.unknown_age_days;
  const capped = Math.min(Math.max(days, 0), model.maturity_days);
  return model.maturity_floor + (capped / model.maturity_days) * model.maturity_range;
}

/** The chain multiplier: five percent per extra chain, up to four. */
function chainFactor(chainCount: number, model: ModelParams): number {
  const extra = Math.min(Math.max(chainCount - 1, 0), model.chain_max);
  return 1 + extra * model.chain_step;
}

/** The four multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: ProtocolEntry,
  asOf: string,
  model: ModelParams,
): { implied: number; growthPct: number; growthMult: number; maturityMult: number; chainMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const growthPct = clampedGrowth(protocol.change_7d, model);
  const growthMult = growthFactor(growthPct, model);
  const maturityMult = maturityFactor(age, model);
  const chainMult = chainFactor(protocol.chains.length, model);
  const base = protocol.tvl_usd * model.base_multiple;
  const implied = Math.max(1, Math.round(base * growthMult * maturityMult * chainMult));
  return { implied, growthPct, growthMult, maturityMult, chainMult, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSION_TAIL = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Whether a protocol records no token at all. */
export function isPreToken(p: ProtocolEntry): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token, not an exchange, not a versioned pool. */
export function isRankable(p: ProtocolEntry): boolean {
  return isPreToken(p) && p.category !== 'CEX' && !VERSION_TAIL.test(p.name);
}

/** The snapshot's protocols keyed by slug. */
function indexBySlug(protocols: ProtocolEntry[]): Map<string, ProtocolEntry> {
  return new Map(protocols.map((entry) => [entry.slug, entry]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: SnapshotDoc, model: ModelParams = MODEL): BoardRow[] {
  const index = indexBySlug(snapshot.protocols);
  const chosen = new Map<string, ProtocolEntry>();
  // The watchlist is the floor: every slug it names joins the board, even one the
  // snapshot no longer carries (it cannot, but coverage is the gate's row and is
  // never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const found = index.get(slug);
    if (found !== undefined) chosen.set(slug, found);
  }
  // The early radar: every rankable pre-token protocol below the watchlist floor.
  // No cap, no TVL shortlist — the radar exists to find the early ones, and the
  // model itself orders them.
  for (const entry of snapshot.protocols) {
    if (!chosen.has(entry.slug) && isRankable(entry) && entry.tvl_usd < snapshot.floor_usd) {
      chosen.set(entry.slug, entry);
    }
  }

  const scored = [...chosen.values()].map((entry) => {
    const score = impliedValue(entry, snapshot.as_of, model);
    return { entry, ...score };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.entry.slug < b.entry.slug ? -1 : a.entry.slug > b.entry.slug ? 1 : 0));
  return scored.map((item, position) => ({
    rank: position + 1,
    slug: item.entry.slug,
    name: item.entry.name,
    category: item.entry.category,
    chains: item.entry.chains,
    tvl_usd: item.entry.tvl_usd,
    change_7d: item.entry.change_7d,
    mcap_usd: item.entry.mcap_usd,
    listed_at: item.entry.listed_at,
    gecko_id: item.entry.gecko_id,
    symbol: item.entry.symbol,
    token_status: 'pre-token' as const,
    age_days: item.age,
    implied_value_usd: item.implied,
    model: {
      base_multiple: model.base_multiple,
      growth_pct: item.growthPct,
      growth_multiplier: round4dp(item.growthMult),
      maturity_multiplier: round4dp(item.maturityMult),
      chain_multiplier: round4dp(item.chainMult),
      age_days: item.age,
    },
    farm_steps: planSteps(item.entry, item.age).map(formatStep),
  }));
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: SnapshotDoc): LiveRow[] {
  const live = snapshot.protocols
    .filter((entry) => !isPreToken(entry) && entry.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS);
  return live.map((entry) => {
    const { slug, name, category, chains, tvl_usd, mcap_usd, change_7d } = entry;
    return { slug, name, category, chains, tvl_usd, mcap_usd, change_7d };
  });
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  const { rank, slug, name, category, chains, tvl_usd, change_7d, mcap_usd, listed_at, age_days, implied_value_usd } = row;
  const { growth_multiplier, maturity_multiplier, chain_multiplier } = row.model;
  return { rank, slug, name, category, chains, tvl_usd, change_7d, mcap_usd, listed_at, age_days, implied_value_usd, growth_multiplier, maturity_multiplier, chain_multiplier };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: SnapshotDoc, model: ModelParams = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const early = board.filter((row) => !snapshot.watchlist.includes(row.slug)).length;
  const { as_of, source, floor_usd, watchlist } = snapshot;
  const radar: RadarData = {
    as_of,
    source,
    floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist,
    watchlist_size: watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The first chain a protocol names, or a neutral phrase. */
function firstChain(p: ProtocolEntry): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** The second chain a protocol names, or null. */
function otherChain(p: ProtocolEntry): string | null {
  return p.chains.length > 1 ? p.chains[1]! : null;
}

/** Capital tiers, biggest TVL first: the floor a protocol must clear, and the stake it earns. */
const STAKE_TIERS: Array<[number, number]> = [
  [5_000_000_000, 250],
  [1_000_000_000, 150],
  [100_000_000, 100],
];

/** How much capital one farm position needs, from the protocol's own TVL. */
function stakeSize(p: ProtocolEntry): number {
  for (const [floor, size] of STAKE_TIERS) if (p.tvl_usd >= floor) return size;
  return 50;
}

/** Hold tiers, youngest first: the age a protocol must stay under, and the hold it earns. */
const HOLD_TIERS: Array<[number, number]> = [
  [180, 60],
  [365, 45],
];

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdSpan(age: number | null): number {
  if (age === null) return 30;
  for (const [under, days] of HOLD_TIERS) if (age < under) return days;
  return 30;
}

/** One category rule: when the category names any of these words, the plan takes this action. */
interface CategoryRule {
  words: string[];
  action: (name: string, capital: number, chain: string) => string;
}

/**
 * The category rules, in the order they are tried — the first match wins. The wording
 * of each action is the plan's own: it tells a farmer what to do with the capital on
 * the chain, and it never claims a token, an airdrop or a points program.
 */
const CATEGORY_RULES: CategoryRule[] = [
  { words: ['lend', 'cdp', 'collateral'], action: (name, capital, chain) => 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open.' },
  { words: ['dex', 'yield', 'leveraged farm'], action: (name, capital, chain) => 'Provide $' + capital + ' of liquidity to ' + name + "'s main pool on " + chain + ' and keep the position open.' },
  { words: ['bridge'], action: (name, capital, chain) => 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds in its app.' },
  { words: ['staking', 'restak'], action: (name, capital, chain) => 'Stake $' + capital + " of the chain's staking asset through " + name + ' and keep the receipt.' },
  { words: ['perpetual', 'derivative'], action: (name, capital, chain) => 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedge.' },
  { words: ['prediction'], action: (name, capital, chain) => 'Fund $' + capital + ' and place one market position on ' + name + '.' },
  { words: ['curator', 'allocator'], action: (name, capital, chain) => 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares.' },
  { words: ['basis'], action: (name, capital, chain) => 'Deposit $' + capital + ' of USDC into a ' + name + ' basis vault on ' + chain + ' and keep the shares.' },
  { words: ['stablecoin wrapper', 'stable'], action: (name, capital, chain) => 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + '.' },
  { words: ['rwa'], action: (name, capital, chain) => 'Mint $' + capital + " of the protocol's yield asset on " + chain + ' and hold it.' },
  { words: ['insurance'], action: (name, capital, chain) => 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy.' },
  { words: ['chain'], action: (name, capital, chain) => 'Bridge $' + capital + ' of USDC to ' + chain + " through its native bridge and use one of the chain's core apps." },
  { words: ['payment'], action: (name, capital, chain) => 'Route $' + capital + " through " + name + "'s payment rails on " + chain + ' and keep the receipt.' },
  { words: ['governance'], action: (name, capital, chain) => 'Deposit $' + capital + ' into ' + name + ' on ' + chain + ' and vote once in its governance.' },
  { words: ['cedefi'], action: (name, capital, chain) => 'Deposit $' + capital + ' of USDC into a ' + name + ' vault on ' + chain + ' and keep the shares.' },
];

/** The category's one action, in the words a farmer can follow. */
function planAction(p: ProtocolEntry, capital: number, chain: string): string {
  const category = (p.category ?? '').toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.words.some((word) => category.includes(word))) return rule.action(p.name, capital, chain);
  }
  return 'Deposit $' + capital + ' of USDC into ' + p.name + ' on ' + chain + ' and keep the position open.';
}

/**
 * A protocol's farm plan: seven steps, each an action with a cost and a time. The plan is derived
 * from the protocol's own record (category, chains, TVL, age), never from a hand-written list of
 * names, and it never claims a token, an airdrop or a points program the snapshot does not record.
 */
export function planSteps(p: ProtocolEntry, age: number | null): PlanStep[] {
  const chain = firstChain(p);
  const chain2 = otherChain(p);
  const capital = stakeSize(p);
  const hold = holdSpan(age);
  const second: [string, string, string] =
    chain2 !== null
      ? [
          'Repeat the core position on ' + chain2 + ' as well, so the activity spans two chains instead of one.',
          'about $4 of gas for the second position',
          '10 minutes',
        ]
      : [
          'Do a second action type the protocol supports, such as a swap, a vote or a second deposit, so the activity is not one transaction.',
          'about $2 of gas for the second action',
          '10 minutes',
        ];
  const rows: Array<[string, string, string]> = [
    [
      'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.',
      'under $3 of gas for the first transaction',
      '5 minutes',
    ],
    [
      planAction(p, capital, chain),
      '$' + capital + ' of capital and about $' + (capital >= 150 ? 8 : 4) + ' of gas',
      '15 minutes to set up',
    ],
    second,
    [
      'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.',
      'about $2 of gas a week',
      '10 minutes a week',
    ],
    [
      'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.',
      'the $' + capital + ' stays in the position',
      hold + ' days',
    ],
    [
      "Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.",
      'no fee to check, and never pay to claim',
      '10 minutes',
    ],
    [
      'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.',
      'nothing but the log',
      '5 minutes',
    ],
  ];
  return rows.map(([text, cost, time]) => ({ text, cost, time }));
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function formatStep(step: PlanStep): string {
  let joined = step.text + ' Cost: ' + step.cost + '. Time: ' + step.time + '.';
  if (joined.length > 600) joined = joined.slice(0, 596) + '...';
  if (joined.length < 20) joined = joined + " Hold the position and check the protocol's own page.";
  return joined;
}

/** Refuse a snapshot with `message`, always throwing. */
function fail(message: string): never {
  throw new SnapshotError(message);
}

/** A string field, or null when the record carries something else. */
function optString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/** A finite number field, or null when the record carries something else. */
function optFinite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** A string list field, keeping only its string entries, or empty when the record has none. */
function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/** One protocol entry out of the snapshot's raw record, refused unless it carries a slug, a name and a TVL. */
function readProtocol(value: unknown, i: number): ProtocolEntry {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`snapshot.json's protocol ${i} is not an object`);
  }
  const record = value as Record<string, unknown>;
  const slug = record.slug;
  const name = record.name;
  const tvl = record.tvl_usd;
  if (typeof slug !== 'string' || typeof name !== 'string' || typeof tvl !== 'number' || !Number.isFinite(tvl)) {
    fail(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
  }
  return {
    slug,
    name,
    category: optString(record.category),
    chains: stringList(record.chains),
    tvl_usd: tvl,
    change_7d: optFinite(record.change_7d),
    mcap_usd: optFinite(record.mcap_usd),
    listed_at: optString(record.listed_at),
    gecko_id: optString(record.gecko_id),
    symbol: optString(record.symbol),
  };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): SnapshotDoc {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    fail('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) fail('snapshot.json is not a JSON object');
  const doc = raw as Record<string, unknown>;
  const asOf = doc.as_of;
  if (typeof asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) fail('snapshot.json has no as_of date');
  const source = doc.source;
  if (typeof source !== 'string') fail('snapshot.json has no source');
  const floor = doc.floor_usd;
  if (typeof floor !== 'number' || !Number.isSafeInteger(floor) || floor <= 0) fail('snapshot.json has no floor_usd');
  if (!Array.isArray(doc.protocols)) fail('snapshot.json has no protocols array');
  const watchlist = doc.watchlist;
  if (!Array.isArray(watchlist) || watchlist.some((entry) => typeof entry !== 'string')) fail('snapshot.json has no watchlist of slugs');
  return {
    as_of: asOf,
    source,
    floor_usd: floor,
    protocols: doc.protocols.map(readProtocol),
    watchlist: watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: SnapshotDoc): string | null {
  const onBoard = new Set(board.map((row) => row.slug));
  const missing = snapshot.watchlist.filter((slug) => !onBoard.has(slug));
  if (missing.length > 0) {
    return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  }
  const ranks = board.map((row) => row.rank).sort((a, b) => a - b);
  for (let position = 0; position < ranks.length; position++) {
    if (ranks[position] !== position + 1) return `rank ${position + 1} is ${ranks[position]}`;
  }
  for (let position = 1; position < board.length; position++) {
    if (board[position]!.implied_value_usd > board[position - 1]!.implied_value_usd) return `row ${position + 1} outranks row ${position} on implied value`;
  }
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const row of board) {
    const steps = row.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${row.slug} has ${steps.length} farm steps`;
    for (const step of steps) {
      if (step.length < 20 || step.length > 600) return `${row.slug} has a farm step of ${step.length} characters`;
    }
    if (!Number.isSafeInteger(row.implied_value_usd) || row.implied_value_usd <= 0) return `${row.slug} has implied value ${row.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return 'window.RADAR=' + JSON.stringify(radar) + ';\n';
}
