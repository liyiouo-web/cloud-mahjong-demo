const SUITS = [
  { key: "m", name: "万", labels: ["一万", "二万", "三万", "四万", "五万", "六万", "七万", "八万", "九万"] },
  { key: "p", name: "筒", labels: ["一筒", "二筒", "三筒", "四筒", "五筒", "六筒", "七筒", "八筒", "九筒"] },
  { key: "s", name: "条", labels: ["一条", "二条", "三条", "四条", "五条", "六条", "七条", "八条", "九条"] },
];

const HONORS = [
  { id: "we", label: "东", kind: "wind", order: 28 },
  { id: "ws", label: "南", kind: "wind", order: 29 },
  { id: "ww", label: "西", kind: "wind", order: 30 },
  { id: "wn", label: "北", kind: "wind", order: 31 },
  { id: "dr", label: "中", kind: "dragon", order: 32 },
  { id: "dg", label: "发", kind: "dragon", order: 33 },
  { id: "dw", label: "白", kind: "dragon", order: 34 },
];

export const TILE_DEFS = [
  ...SUITS.flatMap((suit, suitIndex) =>
    suit.labels.map((label, index) => ({
      id: `${suit.key}${index + 1}`,
      label,
      suit: suit.key,
      number: index + 1,
      kind: "number",
      order: suitIndex * 9 + index + 1,
    }))
  ),
  ...HONORS,
];

const TILE_BY_ID = new Map(TILE_DEFS.map((tile) => [tile.id, tile]));

export function tileInfo(tileOrId) {
  const id = typeof tileOrId === "string" ? tileOrId : tileOrId.id;
  const info = TILE_BY_ID.get(id);
  if (!info) throw new Error(`Unknown tile id: ${id}`);
  return info;
}

export function sortTiles(tiles) {
  return [...tiles].sort((a, b) => tileInfo(a).order - tileInfo(b).order);
}

export function createWall(seed = Date.now()) {
  const wall = [];
  for (const def of TILE_DEFS) {
    for (let copy = 0; copy < 4; copy += 1) {
      wall.push({ ...def, copy });
    }
  }

  const random = seededRandom(seed);
  for (let i = wall.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [wall[i], wall[j]] = [wall[j], wall[i]];
  }
  return wall;
}

export function isWinningHand(tiles) {
  const ids = normalizeIds(tiles);
  if (ids.length % 3 !== 2) return false;
  return isSevenPairs(ids) || getStandardPartition(ids) !== null;
}

export function analyzeHand(tiles, context = {}) {
  const ids = normalizeIds(tiles);
  const concealed = context.concealed !== false;
  const patterns = [];
  const partition = getStandardPartition(ids);
  const sevenPairs = isSevenPairs(ids);

  if (!sevenPairs && !partition) {
    return { winning: false, patterns: [], partition: null };
  }

  const numberTiles = ids.map(tileInfo).filter((tile) => tile.kind === "number");
  const honors = ids.map(tileInfo).filter((tile) => tile.kind !== "number");
  const numberSuits = new Set(numberTiles.map((tile) => tile.suit));
  const allSimples = ids.every((id) => {
    const tile = tileInfo(id);
    return tile.kind === "number" && tile.number >= 2 && tile.number <= 8;
  });

  if (sevenPairs) patterns.push(pattern("seven-pairs"));

  if (partition) {
    const allPongs = partition.melds.every((meld) => meld.type === "triplet");
    const allSequences = partition.melds.every((meld) => meld.type === "sequence");
    const hasHonorTriplet = partition.melds.some((meld) => meld.type === "triplet" && tileInfo(meld.ids[0]).kind !== "number");

    if (allSequences) patterns.push(pattern("pinhu"));
    if (allPongs) patterns.push(pattern("all-pongs"));
    if (hasHonorTriplet) patterns.push(pattern("honor-triplet"));
  }

  if (numberSuits.size === 1 && honors.length === 0) patterns.push(pattern("pure-suit"));
  if (numberSuits.size === 1 && honors.length > 0) patterns.push(pattern("half-suit"));
  if (allSimples) patterns.push(pattern("all-simples"));
  if (concealed) patterns.push(pattern("concealed"));

  if (context.afterKong) patterns.push(pattern("kong-bloom"));
  if (context.lastTile) patterns.push(pattern("last-tile"));
  if (context.selfDraw) patterns.push(pattern("self-draw"));

  return {
    winning: true,
    patterns: dedupePatterns(patterns),
    partition: sevenPairs ? { type: "seven-pairs" } : partition,
  };
}

export function calculateDamage(tiles, context = {}) {
  const analysis = analyzeHand(tiles, context);
  if (!analysis.winning) {
    return { total: 0, base: 0, patterns: [], bonuses: [], analysis };
  }

  const base = 8;
  const patternDamage = analysis.patterns.reduce((sum, item) => sum + item.damage, 0);

  return {
    total: base + patternDamage,
    base,
    patterns: analysis.patterns,
    bonuses: [],
    analysis,
  };
}

export function applyMandateToDamage(result, mandates = []) {
  const next = {
    ...result,
    bonuses: [...result.bonuses],
    total: result.total,
  };
  const patternIds = new Set(result.patterns.map((item) => item.id));

  for (const mandate of mandates) {
    if (mandate.id === "pure-suit-heart" && patternIds.has("pure-suit")) {
      addBonus(next, "清一色之心", 8);
    }
    if (mandate.id === "seven-pairs-crest" && patternIds.has("seven-pairs")) {
      addBonus(next, "七对子之徽", 10);
    }
    if (mandate.id === "nice-kong" && patternIds.has("kong-bloom")) {
      addBonus(next, "杠得漂亮", 12);
    }
    if (mandate.id === "steady-no-deal") {
      addBonus(next, "稳住别放", 0);
    }
    if (mandate.id === "last-turn" && patternIds.has("last-tile")) {
      addBonus(next, "最后一巡", 16);
    }
    if (mandate.id === "big-hand" && result.total >= 25) {
      addBonus(next, "胡了个大的", 6);
    }
    if (mandate.id === "concealed-heart" && patternIds.has("concealed")) {
      addBonus(next, "门清之心", 6);
    }
  }

  return next;
}

function addBonus(result, label, damage) {
  result.bonuses.push({ label, damage });
  result.total += damage;
}

function pattern(id) {
  return PATTERNS[id];
}

function dedupePatterns(patterns) {
  const seen = new Set();
  return patterns.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

const PATTERNS = {
  "pinhu": { id: "pinhu", label: "平胡", damage: 0 },
  "all-pongs": { id: "all-pongs", label: "碰碰胡", damage: 6 },
  "seven-pairs": { id: "seven-pairs", label: "七对子", damage: 12 },
  "pure-suit": { id: "pure-suit", label: "清一色", damage: 18 },
  "half-suit": { id: "half-suit", label: "混一色", damage: 12 },
  "all-simples": { id: "all-simples", label: "断幺", damage: 4 },
  "honor-triplet": { id: "honor-triplet", label: "役牌", damage: 5 },
  "concealed": { id: "concealed", label: "门清", damage: 5 },
  "kong-bloom": { id: "kong-bloom", label: "杠上开花", damage: 15 },
  "last-tile": { id: "last-tile", label: "海底捞月", damage: 10 },
  "self-draw": { id: "self-draw", label: "自摸", damage: 4 },
};

function normalizeIds(tiles) {
  return tiles.map((tile) => typeof tile === "string" ? tile : tile.id);
}

function countsFor(ids) {
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}

function isSevenPairs(ids) {
  if (ids.length !== 14) return false;
  const counts = [...countsFor(ids).values()];
  return counts.length === 7 && counts.every((count) => count === 2);
}

function getStandardPartition(ids) {
  if (ids.length % 3 !== 2) return null;
  const counts = countsFor(ids);
  const orderedIds = [...counts.keys()].sort((a, b) => tileInfo(a).order - tileInfo(b).order);

  for (const pairId of orderedIds) {
    if ((counts.get(pairId) ?? 0) < 2) continue;
    const trial = new Map(counts);
    trial.set(pairId, trial.get(pairId) - 2);
    const melds = findMelds(trial);
    if (melds) {
      return { pair: [pairId, pairId], melds };
    }
  }

  return null;
}

function findMelds(counts) {
  const id = [...counts.keys()]
    .filter((key) => counts.get(key) > 0)
    .sort((a, b) => tileInfo(a).order - tileInfo(b).order)[0];

  if (!id) return [];

  if ((counts.get(id) ?? 0) >= 3) {
    const tripletTrial = new Map(counts);
    tripletTrial.set(id, tripletTrial.get(id) - 3);
    const rest = findMelds(tripletTrial);
    if (rest) return [{ type: "triplet", ids: [id, id, id] }, ...rest];
  }

  const info = tileInfo(id);
  if (info.kind === "number" && info.number <= 7) {
    const id2 = `${info.suit}${info.number + 1}`;
    const id3 = `${info.suit}${info.number + 2}`;
    if ((counts.get(id2) ?? 0) > 0 && (counts.get(id3) ?? 0) > 0) {
      const sequenceTrial = new Map(counts);
      sequenceTrial.set(id, sequenceTrial.get(id) - 1);
      sequenceTrial.set(id2, sequenceTrial.get(id2) - 1);
      sequenceTrial.set(id3, sequenceTrial.get(id3) - 1);
      const rest = findMelds(sequenceTrial);
      if (rest) return [{ type: "sequence", ids: [id, id2, id3] }, ...rest];
    }
  }

  return null;
}

function seededRandom(seed) {
  let value = Number(seed) || 1;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}
