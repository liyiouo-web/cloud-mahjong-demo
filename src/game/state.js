import {
  createWall,
  sortTiles,
  tileInfo,
  isWinningHand,
  calculateDamage,
  applyMandateToDamage,
} from "./mahjong.js";

export const ROLES = [
  {
    id: "safehand",
    name: "稳牌客",
    subtitle: "防守型",
    description: "放铳伤害降低，适合稳扎稳打。",
    fortune: 76,
    startingMandate: { id: "steady-no-deal", name: "稳住别放" },
  },
  {
    id: "kong-maniac",
    name: "杠上狂人",
    subtitle: "爆发型",
    description: "杠牌相关天命更容易出现。",
    fortune: 68,
    startingMandate: { id: "nice-kong", name: "杠得漂亮" },
  },
  {
    id: "pure-gambler",
    name: "清一赌徒",
    subtitle: "花色型",
    description: "清一色伤害提高，适合单花色构筑。",
    fortune: 70,
    startingMandate: { id: "pure-suit-heart", name: "清一色之心" },
  },
  {
    id: "wind-listener",
    name: "听风先生",
    subtitle: "工具型",
    description: "更容易获得发现牌和听牌提示。",
    fortune: 72,
    startingMandate: { id: "useful-tile", name: "这张有用" },
  },
];

export const ENEMIES = [
  { id: "quick-sprite", name: "速胡小妖", type: "普通", obsession: 28, speed: 0.16, damage: 7, style: "低伤害，高胡牌速度。" },
  { id: "pong-ghost", name: "碰牌鬼", type: "普通", obsession: 34, speed: 0.12, damage: 9, style: "喜欢碰牌，容易做碰碰胡。" },
  { id: "tile-guard", name: "守门牌师", type: "普通", obsession: 38, speed: 0.10, damage: 10, style: "防守强，拖回合。" },
  { id: "all-simple-blade", name: "断幺刀客", type: "普通", obsession: 32, speed: 0.15, damage: 8, style: "偏速攻，牌型轻快。" },
  { id: "greedy-fox", name: "贪番狐仙", type: "精英", obsession: 48, speed: 0.10, damage: 15, style: "前期慢，胡牌伤害高。" },
  { id: "wind-judge", name: "风牌判官", type: "精英", obsession: 46, speed: 0.11, damage: 13, style: "字牌相关伤害提高。" },
  { id: "kong-wraith", name: "杠鬼", type: "精英", obsession: 44, speed: 0.13, damage: 12, style: "频繁杠牌，制造压力。" },
  { id: "paper-double", name: "纸人替身", type: "精英", obsession: 42, speed: 0.10, damage: 10, style: "第一次被击破时保留一点执念。" },
  { id: "river-thief", name: "牌河窃客", type: "普通", obsession: 36, speed: 0.13, damage: 9, style: "从弃牌中寻找机会。" },
  { id: "red-dragon-monk", name: "红中僧", type: "普通", obsession: 35, speed: 0.12, damage: 11, style: "箭牌成型时伤害更高。" },
  { id: "silent-dealer", name: "默庄", type: "精英", obsession: 50, speed: 0.09, damage: 16, style: "少说话，但一胡就很痛。" },
  { id: "night-market-shark", name: "鬼市老千", type: "精英", obsession: 52, speed: 0.12, damage: 14, style: "会让你的铜钱变得危险。" },
  { id: "tile-dragon", name: "牌山龙王", type: "Boss", obsession: 78, speed: 0.12, damage: 18, style: "每 6 巡后压力提高。击败它通关。" },
  { id: "lamp-fox-boss", name: "狐灯局主", type: "Boss", obsession: 72, speed: 0.14, damage: 16, style: "天命卡会变得诱人且危险。" },
  { id: "paper-court-boss", name: "纸庭判官", type: "Boss", obsession: 82, speed: 0.10, damage: 20, style: "字牌与最后一巡有额外威胁。" },
];

export const MANDATES = [
  { id: "pure-suit-heart", tier: "silver", name: "清一色之心", type: "流派", description: "清一色胡牌额外 +8 伤害。" },
  { id: "pure-suit-crown", tier: "gold", name: "清一色之冕", type: "流派", description: "每场首次打出非目标花色时，发现一张同花色牌。" },
  { id: "seven-pairs-heart", tier: "silver", name: "七对子之心", type: "流派", description: "对子越多，听牌提示越积极。" },
  { id: "seven-pairs-crest", tier: "gold", name: "七对子之徽", type: "流派", description: "七对子胡牌额外 +10 伤害。" },
  { id: "all-pongs-heart", tier: "silver", name: "碰碰胡之心", type: "流派", description: "刻子相关牌会被标记为推荐保留。" },
  { id: "concealed-heart", tier: "silver", name: "门清之心", type: "流派", description: "门清胡牌额外 +6 伤害。" },
  { id: "all-simple-rush", tier: "silver", name: "断幺快攻", type: "流派", description: "无幺九字牌时，本场敌人压力略降。" },
  { id: "honor-glow", tier: "gold", name: "字字珠玑", type: "流派", description: "役牌出现时伤害提示更明显。" },
  { id: "nice-kong", tier: "gold", name: "杠得漂亮", type: "行为", description: "杠上开花额外 +12 伤害。" },
  { id: "kong-again", tier: "prismatic", name: "再杠一次", type: "行为", description: "每场第一次杠后获得一次发现牌。" },
  { id: "steady-no-deal", tier: "silver", name: "稳住别放", type: "防守", description: "敌人胡牌伤害 -4。" },
  { id: "danger-shield", tier: "gold", name: "危险牌免疫", type: "防守", description: "每场第一次受到敌人胡牌时，再减 6 伤害。" },
  { id: "pandora-tiles", tier: "gold", name: "潘朵拉的牌", type: "工具", description: "每 3 巡可将一张牌转化为同花色相邻牌。" },
  { id: "useful-tile", tier: "silver", name: "这张有用", type: "工具", description: "每场一次，发现一张接近当前牌型的牌。" },
  { id: "smooth-draw", tier: "silver", name: "越摸越顺", type: "工具", description: "牌山低于一半后，摸牌提示更强。" },
  { id: "last-turn", tier: "gold", name: "最后一巡", type: "爆发", description: "海底捞月额外 +16 伤害。" },
  { id: "compound-interest", tier: "silver", name: "利滚利", type: "经济", description: "胜利后额外 +2 铜钱。" },
  { id: "tiny-giant", tier: "gold", name: "小巨人", type: "生存", description: "最大气运 +12，下一场敌人执念 +8。" },
  { id: "comeback", tier: "gold", name: "孤注一掷", type: "爆发", description: "气运低于 30 时，胡牌额外 +8 伤害。" },
  { id: "keep-one", tier: "silver", name: "留一手", type: "工具", description: "战斗开始时额外保留一张高价值牌。" },
  { id: "old-partner", tier: "silver", name: "老搭子", type: "工具", description: "相同对子连续出现时获得额外铜钱。" },
  { id: "change-plan", tier: "silver", name: "换个思路", type: "工具", description: "打出孤张后，下一次发现牌更灵活。" },
  { id: "all-in", tier: "prismatic", name: "全都要", type: "风险", description: "胡牌伤害 +10，但敌人胡牌伤害 +5。" },
  { id: "fortune-favored", tier: "gold", name: "牌运眷顾", type: "工具", description: "每场开局多一次整理手牌机会。" },
  { id: "ready-boost", tier: "silver", name: "听牌加速", type: "工具", description: "接近听牌时会突出有效牌。" },
  { id: "river-project", tier: "gold", name: "源计划：牌河", type: "牌河", description: "弃牌越集中，同花色胡牌越强。" },
  { id: "best-pair", tier: "silver", name: "最佳拍档", type: "流派", description: "对子会被高亮，七对子路线更清楚。" },
  { id: "shoulder-to-shoulder", tier: "silver", name: "并肩作战", type: "流派", description: "连续顺子会被高亮。" },
  { id: "level-up", tier: "gold", name: "升级咯！", type: "经济", description: "商店出现更高等级天命。" },
  { id: "self-draw-spark", tier: "silver", name: "自摸火花", type: "行为", description: "自摸额外 +4 伤害。" },
  { id: "dealer-eye", tier: "silver", name: "庄家的眼", type: "防守", description: "危险牌提示更早出现。" },
  { id: "borrow-east", tier: "gold", name: "借东风", type: "工具", description: "打出风牌后有机会发现另一张风牌。" },
  { id: "shop-gold", tier: "silver", name: "鬼市折扣", type: "经济", description: "商店购买费用 -2。" },
  { id: "tea-rest", tier: "silver", name: "一盏热茶", type: "生存", description: "休息节点恢复更多气运。" },
  { id: "big-hand", tier: "gold", name: "胡了个大的", type: "爆发", description: "总伤害达到 25 以上时，额外 +6 伤害。" },
  { id: "cursed-focus", tier: "prismatic", name: "执念专注", type: "风险", description: "只要胡牌就 +14 伤害，但不能获得休息治疗。" },
];

export function createRun(seed = Date.now(), roleId = "wind-listener") {
  const role = ROLES.find((item) => item.id === roleId) ?? ROLES[0];
  const route = [
    { kind: "normal", label: "普通局", enemyId: "quick-sprite" },
    { kind: "normal", label: "普通局", enemyId: "pong-ghost" },
    { kind: "event", label: "事件" },
    { kind: "elite", label: "精英局", enemyId: "greedy-fox" },
    { kind: "shop", label: "鬼市" },
    { kind: "rest", label: "茶歇" },
    { kind: "normal", label: "普通局", enemyId: "wind-judge" },
    { kind: "elite", label: "精英局", enemyId: "kong-wraith" },
    { kind: "event", label: "事件" },
    { kind: "boss", label: "Boss", enemyId: "tile-dragon" },
  ];

  return {
    seed,
    role,
    route,
    clearedNodes: 0,
    fortune: role.fortune,
    maxFortune: role.fortune,
    coins: 8,
    mandates: [role.startingMandate],
    pendingReward: null,
    currentBattle: null,
    message: "牌楼开局。选择路线上的第一个节点开始。",
    runOver: false,
    wonRun: false,
  };
}

export function startBattle(run, enemyId) {
  const enemyTemplate = ENEMIES.find((item) => item.id === enemyId) ?? ENEMIES[0];
  const wall = createWall(run.seed + run.clearedNodes * 131 + enemyTemplate.obsession);
  const playerHand = [];
  const enemyHand = [];

  for (let i = 0; i < 13; i += 1) playerHand.push(wall.pop().id);
  for (let i = 0; i < 13; i += 1) enemyHand.push(wall.pop().id);
  playerHand.push(wall.pop().id);

  const battle = {
    enemy: { ...enemyTemplate, maxObsession: enemyTemplate.obsession },
    wall,
    playerHand: sortTiles(playerHand),
    enemyHand: sortTiles(enemyHand),
    playerDiscards: [],
    enemyDiscards: [],
    turn: 1,
    calls: [],
    lastAction: "开局摸牌。打出一张牌，或者如果已经成牌就胡。",
    onceShieldUsed: false,
  };
  run.currentBattle = battle;
  run.message = `你遇到了${battle.enemy.name}。${battle.enemy.style}`;
  return battle;
}

export function discardTile(run, battle, handIndex) {
  if (handIndex < 0 || handIndex >= battle.playerHand.length) {
    return { error: "请选择一张手牌。" };
  }

  const [discarded] = battle.playerHand.splice(handIndex, 1);
  battle.playerDiscards.push(discarded);
  battle.turn += 1;

  const enemyResult = resolveEnemyPressure(run, battle, discarded);
  if (run.fortune <= 0) {
    run.runOver = true;
    run.message = "气运归零，本轮冒险失败。";
    return enemyResult;
  }

  if (battle.wall.length > 0) {
    battle.playerHand.push(battle.wall.pop().id);
    battle.playerHand = sortTiles(battle.playerHand);
  }

  return enemyResult;
}

export function resolvePlayerWin(run, battle) {
  if (!isWinningHand(battle.playerHand)) {
    return { victory: false, error: "这手牌还没有胡。" };
  }

  const context = {
    concealed: battle.calls.length === 0,
    selfDraw: true,
    lastTile: battle.wall.length <= 1,
    afterKong: false,
  };
  let damage = calculateDamage(battle.playerHand, context);
  damage = applyMandateToDamage(damage, run.mandates);
  damage = applyRunDamageBonuses(run, damage);

  battle.enemy.obsession = Math.max(0, battle.enemy.obsession - damage.total);
  battle.lastAction = `胡牌造成 ${damage.total} 点伤害。`;

  if (battle.enemy.obsession <= 0) {
    run.clearedNodes += 1;
    run.pendingReward = drawMandateChoices(run);
    run.currentBattle = null;
    run.coins += rewardCoins(run);
    if (battle.enemy.type === "Boss") {
      run.wonRun = true;
      run.runOver = true;
      run.message = "牌山龙王执念已散，牌楼通关。";
    } else {
      run.message = `击败${battle.enemy.name}。选择一项天命强化。`;
    }
    return { victory: true, damage };
  }

  redealBattleHand(run, battle);
  run.message = `${battle.enemy.name}还剩 ${battle.enemy.obsession} 点执念，新一局继续。`;
  return { victory: false, damage };
}

export function chooseMandateReward(run, mandateId) {
  const mandate = run.pendingReward?.find((item) => item.id === mandateId);
  if (!mandate) return null;
  run.mandates.push(mandate);
  run.pendingReward = null;
  run.coins += 4;
  run.message = `获得天命：${mandate.name}。`;

  if (mandate.id === "tiny-giant") {
    run.maxFortune += 12;
    run.fortune += 12;
  }

  return mandate;
}

export function resolveNode(run, node) {
  if (run.pendingReward || run.currentBattle || run.runOver) return null;

  if (node.kind === "normal" || node.kind === "elite" || node.kind === "boss") {
    return startBattle(run, node.enemyId);
  }
  if (node.kind === "event") {
    run.coins += 5;
    run.fortune = Math.min(run.maxFortune, run.fortune + 4);
    run.clearedNodes += 1;
    run.pendingReward = drawMandateChoices(run);
    run.message = "鬼市纸签飘落：获得铜钱与一次天命选择。";
    return null;
  }
  if (node.kind === "shop") {
    run.coins = Math.max(0, run.coins - shopCost(run));
    run.pendingReward = drawMandateChoices(run, true);
    run.clearedNodes += 1;
    run.message = "鬼市开张。花铜钱换一次更好的天命选择。";
    return null;
  }
  if (node.kind === "rest") {
    if (!run.mandates.some((item) => item.id === "cursed-focus")) {
      const heal = run.mandates.some((item) => item.id === "tea-rest") ? 20 : 12;
      run.fortune = Math.min(run.maxFortune, run.fortune + heal);
    }
    run.clearedNodes += 1;
    run.message = "茶歇结束，气运稍复。";
    return null;
  }

  return null;
}

export function suggestTiles(hand) {
  const counts = new Map();
  for (const id of hand) counts.set(id, (counts.get(id) ?? 0) + 1);
  return hand.map((id) => {
    const info = tileInfo(id);
    const count = counts.get(id);
    const neighbor =
      info.kind === "number" &&
      ((counts.get(`${info.suit}${info.number - 1}`) ?? 0) > 0 ||
        (counts.get(`${info.suit}${info.number + 1}`) ?? 0) > 0);
    return {
      id,
      label: info.label,
      keep: count >= 2 || neighbor,
      danger: info.kind !== "number" || info.number === 1 || info.number === 9 ? "high" : count >= 2 ? "low" : "mid",
    };
  });
}

function resolveEnemyPressure(run, battle, discarded) {
  const rng = makeRng(run.seed + battle.turn * 37 + tileInfo(discarded).order);
  const bossRamp = battle.enemy.type === "Boss" && battle.turn >= 6 ? 0.05 : 0;
  const pressure = battle.enemy.speed + bossRamp;

  const enemyDiscard = battle.enemyHand.shift();
  if (enemyDiscard) battle.enemyDiscards.push(enemyDiscard);
  if (battle.wall.length > 0) battle.enemyHand.push(battle.wall.pop().id);
  battle.enemyHand = sortTiles(battle.enemyHand);

  if (rng() < pressure) {
    const damage = reduceIncomingDamage(run, battle, battle.enemy.damage + Math.floor(battle.turn / 4));
    run.fortune = Math.max(0, run.fortune - damage);
    battle.lastAction = `${battle.enemy.name}抢先胡牌，你损失 ${damage} 点气运。`;
    redealBattleHand(run, battle);
    return { enemyWon: true, damage };
  }

  battle.lastAction = `${battle.enemy.name}打出${tileInfo(enemyDiscard ?? discarded).label}，你摸入一张牌。`;
  return { enemyWon: false, damage: 0 };
}

function redealBattleHand(run, battle) {
  if (battle.wall.length < 28) {
    battle.wall = createWall(run.seed + battle.turn * 97 + battle.enemy.obsession);
  }
  battle.playerHand = [];
  battle.enemyHand = [];
  battle.playerDiscards = [];
  battle.enemyDiscards = [];
  for (let i = 0; i < 13; i += 1) battle.playerHand.push(battle.wall.pop().id);
  for (let i = 0; i < 13; i += 1) battle.enemyHand.push(battle.wall.pop().id);
  battle.playerHand.push(battle.wall.pop().id);
  battle.playerHand = sortTiles(battle.playerHand);
  battle.enemyHand = sortTiles(battle.enemyHand);
  battle.turn = 1;
}

function drawMandateChoices(run, upgraded = false) {
  const owned = new Set(run.mandates.map((item) => item.id));
  const pool = MANDATES.filter((item) => !owned.has(item.id));
  const rng = makeRng(run.seed + run.clearedNodes * 211 + run.coins + (upgraded ? 17 : 0));
  const weighted = pool
    .map((mandate) => ({
      mandate,
      roll: rng() - tierWeight(mandate, upgraded),
    }))
    .sort((a, b) => a.roll - b.roll)
    .slice(0, 3)
    .map((item) => item.mandate);
  return weighted;
}

function tierWeight(mandate, upgraded) {
  if (mandate.tier === "prismatic") return upgraded ? 0.16 : 0.04;
  if (mandate.tier === "gold") return upgraded ? 0.12 : 0.08;
  return 0.1;
}

function rewardCoins(run) {
  let coins = 5;
  if (run.mandates.some((item) => item.id === "compound-interest")) coins += 2;
  return coins;
}

function shopCost(run) {
  return run.mandates.some((item) => item.id === "shop-gold") ? 2 : 4;
}

function reduceIncomingDamage(run, battle, incoming) {
  let damage = incoming;
  if (run.mandates.some((item) => item.id === "steady-no-deal")) damage -= 4;
  if (!battle.onceShieldUsed && run.mandates.some((item) => item.id === "danger-shield")) {
    damage -= 6;
    battle.onceShieldUsed = true;
  }
  if (run.mandates.some((item) => item.id === "all-in")) damage += 5;
  return Math.max(1, damage);
}

function applyRunDamageBonuses(run, damage) {
  const next = { ...damage, bonuses: [...damage.bonuses], total: damage.total };
  if (run.mandates.some((item) => item.id === "self-draw-spark")) {
    next.bonuses.push({ label: "自摸火花", damage: 4 });
    next.total += 4;
  }
  if (run.mandates.some((item) => item.id === "comeback") && run.fortune < 30) {
    next.bonuses.push({ label: "孤注一掷", damage: 8 });
    next.total += 8;
  }
  if (run.mandates.some((item) => item.id === "all-in")) {
    next.bonuses.push({ label: "全都要", damage: 10 });
    next.total += 10;
  }
  if (run.mandates.some((item) => item.id === "cursed-focus")) {
    next.bonuses.push({ label: "执念专注", damage: 14 });
    next.total += 14;
  }
  return next;
}

function makeRng(seed) {
  let value = Number(seed) || 1;
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648;
    return value / 2147483648;
  };
}
