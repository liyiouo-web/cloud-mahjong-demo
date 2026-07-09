import {
  ROLES,
  createRun,
  resolveNode,
  discardTile,
  resolvePlayerWin,
  chooseMandateReward,
  suggestTiles,
} from "./game/state.js";
import {
  tileInfo,
  sortTiles,
  isWinningHand,
} from "./game/mahjong.js";

const app = document.querySelector("#app");
const uiRoot = document.querySelector("#uiRoot");
const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const images = {
  title: loadImage("./assets/title-bg.jpg"),
  table: loadImage("./assets/city-sheet.jpg"),
};

const LANG_KEY = "tianming-language";
let lang = localStorage.getItem(LANG_KEY) === "en" ? "en" : "zh";
let selectedRoleId = "wind-listener";
let run = createRun(20260617, selectedRoleId);
let phase = "role";
let selectedTile = null;
let discoveryUsedForTurn = false;
let lastFrame = 0;

const ui = {
  zh: {
    title: "天命牌局",
    roleTitle: "选择牌手",
    roleDesc: "每个牌手自带一个初始天命，决定第一条运营路线。",
    start: "开始游戏",
    routeTitle: "选择路线",
    routeDesc: "普通局积累节奏，精英局和 Boss 会带来更强牌桌压力。",
    reset: "重开",
    final: "终局",
    victory: "胜利",
    defeat: "惜败",
    wonReason: "牌山已静",
    lostReason: "气运已散",
    again: "再来一局",
    wall: "牌山",
    hand: "手牌",
    aiHand: "AI 手牌",
    emptyRiver: "暂无弃牌",
    actionWin: "胡牌",
    actionWinReady: "造成伤害",
    actionWinNo: "未成牌",
    actionDiscover: "发现牌",
    actionDiscoverReady: "天命工具",
    actionDiscoverNo: "不可用",
    actionTrial: "试炼成牌",
    actionTrialSub: "演示用",
    actionResetSub: "新一轮",
    routeStage: "牌楼",
    roleStage: "入局",
    battleStage: "对局",
    rolePath: "牌手 -> 路线 -> 天命",
    rewardTitle: "天命强化",
    rewardDesc: "三选一，确定接下来的运营路线。",
    emptyMandate: "天命槽",
    discardHint: "将弃",
    langButton: "EN",
    langLabel: "Switch to English",
    node: {
      normal: "普通局",
      elite: "精英局",
      event: "事件",
      shop: "鬼市",
      rest: "茶歇",
      boss: "Boss",
    },
    icon: { normal: "牌", elite: "妖", event: "签", shop: "市", rest: "茶", boss: "局" },
    tier: { silver: "白银", gold: "黄金", prismatic: "棱彩" },
  },
  en: {
    title: "Mandate of Tiles",
    roleTitle: "Choose Player",
    roleDesc: "Each player starts with one Mandate that shapes the first build path.",
    start: "Start Run",
    routeTitle: "Choose Route",
    routeDesc: "Normal rounds build tempo; elites and bosses add heavier table pressure.",
    reset: "Restart",
    final: "Run End",
    victory: "Victory",
    defeat: "Defeat",
    wonReason: "The wall falls silent",
    lostReason: "Fortune exhausted",
    again: "Play Again",
    wall: "Wall",
    hand: "Hand",
    aiHand: "AI Hand",
    emptyRiver: "No discards",
    actionWin: "Win",
    actionWinReady: "Deal damage",
    actionWinNo: "Not ready",
    actionDiscover: "Discover",
    actionDiscoverReady: "Mandate tool",
    actionDiscoverNo: "Unavailable",
    actionTrial: "Trial Hand",
    actionTrialSub: "Demo",
    actionResetSub: "New run",
    routeStage: "Route",
    roleStage: "Entry",
    battleStage: "Battle",
    rolePath: "Player -> Route -> Mandate",
    rewardTitle: "Mandate Augment",
    rewardDesc: "Pick one of three to define the next build direction.",
    emptyMandate: "Mandate Slot",
    discardHint: "Discard",
    langButton: "中",
    langLabel: "切换到中文",
    node: {
      normal: "Normal",
      elite: "Elite",
      event: "Event",
      shop: "Market",
      rest: "Tea Rest",
      boss: "Boss",
    },
    icon: { normal: "T", elite: "E", event: "?", shop: "$", rest: "+", boss: "B" },
    tier: { silver: "Silver", gold: "Gold", prismatic: "Prismatic" },
  },
};

const text = {
  roles: {
    "safehand": { en: ["Safehand Keeper", "Defense", "Reduces incoming win damage. Good for steady play.", "Hold, Don't Deal"] },
    "kong-maniac": { en: ["Kong Maniac", "Burst", "Kong-related Mandates appear more naturally.", "Nice Kong"] },
    "pure-gambler": { en: ["Pure Suit Gambler", "Suit Build", "Pure-suit wins hit harder. Best for single-suit planning.", "Heart of Pure Suit"] },
    "wind-listener": { en: ["Wind Listener", "Utility", "Finds useful tiles and keeps listen-state hints clear.", "This One Helps"] },
  },
  enemies: {
    "quick-sprite": ["Quick-Win Sprite", "low damage, high winning speed"],
    "pong-ghost": ["Pong Ghost", "likes triplets and pong-shaped hands"],
    "tile-guard": ["Gate Tilekeeper", "defensive and slow"],
    "all-simple-blade": ["All-Simples Blade", "fast light attacks"],
    "greedy-fox": ["Greedy Fox Immortal", "slow early, heavy win damage"],
    "wind-judge": ["Wind-Tile Judge", "honor-tile pressure"],
    "kong-wraith": ["Kong Wraith", "frequent kong pressure"],
    "paper-double": ["Paper Double", "survives the first break"],
    "river-thief": ["River Thief", "looks for chances in discards"],
    "red-dragon-monk": ["Red Dragon Monk", "dragon hands hurt more"],
    "silent-dealer": ["Silent Dealer", "quiet but painful"],
    "night-market-shark": ["Night Market Shark", "turns coins into risk"],
    "tile-dragon": ["Wall Dragon King", "boss pressure rises after turn 6"],
    "lamp-fox-boss": ["Lamp Fox Boss", "tempting but risky Mandates"],
    "paper-court-boss": ["Paper Court Judge", "honors and last-tile threats"],
  },
  mandates: {
    "pure-suit-heart": ["Heart of Pure Suit", "Pure Suit wins deal +8 damage.", "Build"],
    "pure-suit-crown": ["Crown of Pure Suit", "First off-suit discard each battle discovers a target-suit tile.", "Build"],
    "seven-pairs-heart": ["Heart of Seven Pairs", "More pairs make keep hints more aggressive.", "Build"],
    "seven-pairs-crest": ["Crest of Seven Pairs", "Seven Pairs wins deal +10 damage.", "Build"],
    "all-pongs-heart": ["Heart of All Pongs", "Triplet-related tiles are marked as recommended keeps.", "Build"],
    "concealed-heart": ["Heart of Concealed Hand", "Concealed wins deal +6 damage.", "Build"],
    "all-simple-rush": ["All-Simples Rush", "If your hand has no terminals or honors, enemy pressure drops slightly.", "Build"],
    "honor-glow": ["Honor Glow", "Honor-tile damage opportunities become clearer.", "Build"],
    "nice-kong": ["Nice Kong", "After-a-kong wins deal +12 damage.", "Behavior"],
    "kong-again": ["Kong Again", "First kong each battle grants one discovery.", "Behavior"],
    "steady-no-deal": ["Hold, Don't Deal", "Enemy win damage -4.", "Defense"],
    "danger-shield": ["Danger-Tile Immunity", "The first enemy win each battle is reduced by another 6.", "Defense"],
    "pandora-tiles": ["Pandora's Tile", "Every 3 turns, transform one tile into a neighboring same-suit tile.", "Tool"],
    "useful-tile": ["This One Helps", "Once per battle, discover a tile close to your current shape.", "Tool"],
    "smooth-draw": ["Smoother Draws", "Hints become stronger when the wall is under half.", "Tool"],
    "last-turn": ["Final Patrol", "Last-tile wins deal +16 damage.", "Burst"],
    "compound-interest": ["Compound Interest", "Gain +2 coins after each victory.", "Economy"],
    "tiny-giant": ["Tiny Giant", "Max Fortune +12, next enemy obsession +8.", "Survival"],
    "comeback": ["One More Bet", "If Fortune is below 30, wins deal +8 damage.", "Burst"],
    "keep-one": ["Keep One", "Battle starts by preserving one high-value tile.", "Tool"],
    "old-partner": ["Old Partner", "Repeated pairs grant extra coins.", "Tool"],
    "change-plan": ["Change the Plan", "After discarding an isolated tile, next discovery is more flexible.", "Tool"],
    "all-in": ["All In", "Your wins +10 damage, enemy wins +5 damage.", "Risk"],
    "fortune-favored": ["Fortune Favored", "Start each battle with one extra hand-tuning chance.", "Tool"],
    "ready-boost": ["Listen Boost", "Near-ready hands highlight useful tiles.", "Tool"],
    "river-project": ["Project: River", "Concentrated discards increase same-suit win value.", "River"],
    "best-pair": ["Best Pair", "Pairs are highlighted; Seven Pairs route becomes clearer.", "Build"],
    "shoulder-to-shoulder": ["Shoulder to Shoulder", "Connected sequences are highlighted.", "Build"],
    "level-up": ["Level Up!", "Shops offer higher-tier Mandates.", "Economy"],
    "self-draw-spark": ["Self-Draw Spark", "Self-draw wins deal +4 damage.", "Behavior"],
    "dealer-eye": ["Dealer's Eye", "Danger hints appear earlier.", "Defense"],
    "borrow-east": ["Borrow the East Wind", "After discarding a wind, you may discover another wind.", "Tool"],
    "shop-gold": ["Market Discount", "Shop purchase cost -2.", "Economy"],
    "tea-rest": ["A Cup of Hot Tea", "Rest nodes restore more Fortune.", "Survival"],
    "big-hand": ["A Big One", "If total damage reaches 25+, gain +6 damage.", "Burst"],
    "cursed-focus": ["Cursed Focus", "Wins deal +14 damage, but rest healing is disabled.", "Risk"],
  },
  patterns: {
    "pinhu": "All Sequences",
    "all-pongs": "All Pongs",
    "seven-pairs": "Seven Pairs",
    "pure-suit": "Pure Suit",
    "half-suit": "Half Suit",
    "all-simples": "All Simples",
    "honor-triplet": "Honor Triplet",
    "concealed": "Concealed",
    "kong-bloom": "Kong Bloom",
    "last-tile": "Last Tile",
    "self-draw": "Self Draw",
  },
};

function loadImage(src) {
  const img = new Image();
  img.src = src;
  img.onload = () => drawCanvas(performance.now());
  return img;
}

function T(key) {
  return ui[lang][key];
}

function roleText(role) {
  if (lang === "zh") return { name: role.name, subtitle: role.subtitle, description: role.description, mandate: role.startingMandate.name };
  const item = text.roles[role.id]?.en;
  return item ? { name: item[0], subtitle: item[1], description: item[2], mandate: item[3] } : { name: role.name, subtitle: role.subtitle, description: role.description, mandate: role.startingMandate.name };
}

function enemyText(enemy) {
  if (lang === "zh") return { name: enemy.name, style: enemy.style, obsession: enemy.obsession };
  const item = text.enemies[enemy.id];
  return item ? { name: item[0], style: item[1], obsession: enemy.obsession } : { name: enemy.name, style: enemy.style, obsession: enemy.obsession };
}

function mandateText(mandate) {
  if (lang === "zh") return { name: mandate.name, description: mandate.description ?? "", type: mandate.type ?? "" };
  const item = text.mandates[mandate.id];
  return item ? { name: item[0], description: item[1], type: item[2] } : { name: mandate.name, description: mandate.description ?? "", type: mandate.type ?? "" };
}

function tileLabel(id) {
  const info = tileInfo(id);
  if (lang === "zh") return info.label;
  if (info.kind === "wind") return ({ we: "East", ws: "South", ww: "West", wn: "North" })[id];
  if (info.kind === "dragon") return ({ dr: "Red Dragon", dg: "Green Dragon", dw: "White Dragon" })[id];
  const suit = { m: "Character", p: "Dot", s: "Bamboo" }[info.suit];
  return `${info.number} ${suit}`;
}

function translateMessage(message) {
  if (lang === "zh") return message;
  if (!message) return "";
  if (message.includes("牌楼开局")) return "Run started. Choose the first route node.";
  if (message.includes("气运归零")) return "Fortune reached zero. This run is lost.";
  if (message.includes("通关")) return "The Wall Dragon King's obsession is broken. Run cleared.";
  if (message.includes("选择一项天命")) return "Enemy defeated. Choose one Mandate augment.";
  if (message.includes("鬼市纸签")) return "Market slip found: gain coins and one Mandate choice.";
  if (message.includes("鬼市开张")) return "The market opens. Spend coins for a stronger Mandate choice.";
  if (message.includes("茶歇结束")) return "Tea rest complete. Fortune restored.";
  if (message.includes("获得天命")) return "Mandate acquired.";
  if (message.includes("还剩")) return "The enemy still has obsession left. Continue the fight.";
  if (message.includes("你遇到了")) return "You encounter an opponent. Watch their table pressure.";
  return message;
}

function translateAction(action) {
  if (lang === "zh") return action;
  if (!action) return "";
  if (action.includes("开局摸牌")) return "Opening draw. Discard one tile, or win if your hand is complete.";
  if (action.includes("胡牌造成")) return action.replace("胡牌造成", "Win dealt").replace("点伤害", "damage");
  if (action.includes("抢先胡牌")) return "Enemy wins first. You lose Fortune.";
  if (action.includes("打出")) return "Enemy discarded a tile. You draw one tile.";
  if (action.includes("天命发现")) return "Mandate discovery changed an isolated tile.";
  if (action.includes("试炼牌型")) return "Trial winning hand is ready.";
  return action;
}

function render() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title = `${T("title")} H5 Prototype`;
  uiRoot.innerHTML = `
    ${renderHud()}
    ${phase === "role" ? renderRoleOverlay() : ""}
    ${phase !== "role" && !run.currentBattle && !run.pendingReward && !run.runOver ? renderRouteOverlay() : ""}
    ${run.currentBattle ? renderBattleLayer(run.currentBattle) : ""}
    ${run.pendingReward ? renderMandateOverlay() : ""}
    ${run.runOver ? renderResultOverlay() : ""}
    ${renderActions()}
  `;
  bindEvents();
  drawCanvas(performance.now());
}

function renderHud() {
  const battle = run.currentBattle;
  const role = roleText(run.role);
  const stage = phase === "role" ? `0-0 ${T("roleStage")}` : battle ? `${run.clearedNodes + 1}-1 ${T("battleStage")}` : `${run.clearedNodes + 1}-1 ${T("routeStage")}`;
  const title = phase === "role"
    ? T("roleTitle")
    : battle
      ? enemyText(battle.enemy).name
      : ui[lang].node[run.route[run.clearedNodes]?.kind] ?? T("final");
  const sub = phase === "role" ? T("rolePath") : battle ? `${role.name} | ${translateAction(battle.lastAction)}` : translateMessage(run.message);
  const deckCount = battle ? battle.wall.length : 0;

  return `
    <section class="hud">
      <div class="status glass">
        <span class="stage">${stage}</span>
        <strong>${title}</strong>
        <em>${sub}</em>
      </div>
      <div class="round-panel glass">
        <div class="timer-ring ${battle ? "active" : ""}">
          <svg viewBox="0 0 44 44" aria-hidden="true">
            <circle class="timer-bg" cx="22" cy="22" r="18"></circle>
            <circle class="timer-fill" cx="22" cy="22" r="18"></circle>
          </svg>
          <strong>${battle ? Math.max(0, 18 - (battle.turn % 18)) : "--"}</strong>
        </div>
        <span>${T("wall")} ${deckCount}</span>
        <button class="lang-toggle" data-action="lang" aria-label="${T("langLabel")}">${T("langButton")}</button>
      </div>
      <div class="badges">
        ${phase !== "role" ? `<button class="badge city-badge" data-open-route>${role.name}</button>` : ""}
        ${run.mandates.slice(0, 3).map((m) => `<button class="badge ${m.tier ?? "silver"}">${mandateText(m).name}</button>`).join("")}
        ${Array.from({ length: Math.max(0, 3 - run.mandates.slice(0, 3).length) }).map((_, i) => `<span class="badge empty">${T("emptyMandate")} ${i + 1}</span>`).join("")}
      </div>
      <div class="track">
        ${[0, 2, 5].map((node) => `
          <span class="track-node ${run.clearedNodes > node ? "done" : run.clearedNodes === node ? "active" : ""}">
            ${node + 1}-1 ${T("rewardTitle")}
          </span>
        `).join("")}
      </div>
    </section>
  `;
}

function renderRoleOverlay() {
  return `
    <section class="overlay">
      <div class="panel hero-panel">
        <div class="panel-heading">
          <div>
            <h1>${T("roleTitle")}</h1>
            <p>${T("roleDesc")}</p>
          </div>
          <button class="manual-button" data-action="start-selected">${T("start")}</button>
        </div>
        <div class="option-grid role-grid">
          ${ROLES.map((role, index) => {
            const r = roleText(role);
            return `
              <button class="option-card role-card city-art-${index + 1} ${selectedRoleId === role.id ? "selected" : ""}" data-role="${role.id}">
                <span>${r.subtitle}</span>
                <h2>${r.name}</h2>
                <p>${r.description}</p>
                <b>${r.mandate}</b>
              </button>
            `;
          }).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderRouteOverlay() {
  return `
    <section class="overlay route-overlay">
      <div class="panel route-panel">
        <div class="panel-heading">
          <div>
            <h1>${T("routeTitle")}</h1>
            <p>${T("routeDesc")}</p>
          </div>
          <button class="manual-button" data-action="reset">${T("reset")}</button>
        </div>
        <div class="route-grid">
          ${run.route.map((node, index) => renderNodeCard(node, index)).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderNodeCard(node, index) {
  const status = index < run.clearedNodes ? "done" : index === run.clearedNodes ? "current" : "locked";
  const disabled = status !== "current";
  return `
    <button class="node-card ${node.kind} ${status}" ${disabled ? "disabled" : `data-node="${index}"`}>
      <span>${ui[lang].icon[node.kind]}</span>
      <strong>${ui[lang].node[node.kind]}</strong>
      <em>${index + 1}</em>
    </button>
  `;
}

function renderBattleLayer(battle) {
  const handHints = suggestTiles(battle.playerHand);
  const enemy = enemyText(battle.enemy);
  return `
    <section class="battle-layer">
      <div class="opponent left-opponent glass">AI 1 ${T("hand")} 13</div>
      <div class="opponent top-opponent glass">AI 2 ${T("hand")} 13</div>
      <div class="opponent right-opponent glass">
        <span>${enemy.obsession}</span>
        <b>${enemy.name}</b>
      </div>
      <div class="enemy-river river-strip">
        ${renderDiscardTiles(battle.enemyDiscards)}
      </div>
      <div class="hand-row">
        ${handHints.map((hint, index) => renderTile(hint, index)).join("")}
      </div>
      <div class="prompt-pill">${translateAction(battle.lastAction)}</div>
    </section>
  `;
}

function renderTile(hint, index) {
  const info = tileInfo(hint.id);
  const selected = selectedTile === index ? "selected" : "";
  const suitClass = info.kind === "number" ? info.suit : info.kind;
  return `
    <button class="mahjong-tile ${suitClass} ${selected} ${hint.keep ? "keep" : ""}" data-tile="${index}" title="${tileLabel(hint.id)}">
      <small>${hint.keep ? T("discardHint") : ""}</small>
      <img class="tile-face" src="./assets/tiles/${hint.id}.svg" alt="${tileLabel(hint.id)}" />
      <i class="${hint.danger}"></i>
    </button>
  `;
}

function renderDiscardTiles(ids) {
  if (!ids.length) return `<span class="empty-river">${T("emptyRiver")}</span>`;
  return ids.slice(-10).map((id) => `<span class="discard-tile" title="${tileLabel(id)}"><img src="./assets/tiles/${id}.svg" alt="${tileLabel(id)}" /></span>`).join("");
}

function renderMandateOverlay() {
  return `
    <section class="overlay">
      <div class="panel augment-panel">
        <div class="panel-heading">
          <div>
            <h1>${T("rewardTitle")} ${Math.min(run.mandates.length + 1, 3)}/3</h1>
            <p>${T("rewardDesc")}</p>
          </div>
        </div>
        <div class="augment-grid">
          ${run.pendingReward.map((mandate) => {
            const m = mandateText(mandate);
            return `
              <button class="augment-card ${mandate.tier}" data-mandate="${mandate.id}">
                <span>${ui[lang].tier[mandate.tier]}</span>
                <div class="augment-icon">${m.name.slice(0, 1)}</div>
                <h2>${m.name}</h2>
                <p>${m.description}</p>
                <em>${m.type}</em>
              </button>
            `;
          }).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderResultOverlay() {
  return `
    <section class="result-overlay">
      <div class="result-particles" aria-hidden="true">
        ${Array.from({ length: 16 }).map((_, i) => `<i style="--i:${i}"></i>`).join("")}
      </div>
      <div class="result-card">
        <span>${T("final")}</span>
        <h1>${run.wonRun ? T("victory") : T("defeat")}</h1>
        <strong>${run.wonRun ? T("wonReason") : T("lostReason")}</strong>
        <p>${translateMessage(run.message)}</p>
        <button data-action="reset">${T("again")}</button>
      </div>
    </section>
  `;
}

function renderActions() {
  if (phase === "role" || run.pendingReward || run.runOver) return "";
  const battle = run.currentBattle;
  const canWin = battle && isWinningHand(battle.playerHand);
  const discover = battle && canUseDiscovery();
  return `
    <nav class="actions" aria-label="game actions">
      <button data-action="win" ${canWin ? "" : "disabled"}><strong>${T("actionWin")}</strong><span>${canWin ? T("actionWinReady") : T("actionWinNo")}</span></button>
      <button data-action="discover" ${discover ? "" : "disabled"}><strong>${T("actionDiscover")}</strong><span>${discover ? T("actionDiscoverReady") : T("actionDiscoverNo")}</span></button>
      <button data-action="trial" ${battle ? "" : "disabled"}><strong>${T("actionTrial")}</strong><span>${T("actionTrialSub")}</span></button>
      <button data-action="reset"><strong>${T("reset")}</strong><span>${T("actionResetSub")}</span></button>
    </nav>
  `;
}

function bindEvents() {
  uiRoot.querySelectorAll("[data-role]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedRoleId = button.dataset.role;
      run = createRun(Date.now() % 100000, selectedRoleId);
      render();
    });
  });
  uiRoot.querySelectorAll("[data-node]").forEach((button) => {
    button.addEventListener("click", () => {
      const node = run.route[Number(button.dataset.node)];
      resolveNode(run, node);
      selectedTile = null;
      discoveryUsedForTurn = false;
      render();
    });
  });
  uiRoot.querySelectorAll("[data-tile]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.tile);
      if (selectedTile === index) discardSelectedTile();
      else {
        selectedTile = index;
        render();
      }
    });
  });
  uiRoot.querySelectorAll("[data-mandate]").forEach((button) => {
    button.addEventListener("click", () => {
      chooseMandateReward(run, button.dataset.mandate);
      selectedTile = null;
      discoveryUsedForTurn = false;
      render();
    });
  });
  uiRoot.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });
}

function handleAction(action) {
  if (action === "lang") {
    lang = lang === "zh" ? "en" : "zh";
    localStorage.setItem(LANG_KEY, lang);
  }
  if (action === "start-selected") {
    run = createRun(Date.now() % 100000, selectedRoleId);
    phase = "route";
  }
  if (action === "reset") {
    run = createRun(Date.now() % 100000, selectedRoleId);
    phase = "role";
    selectedTile = null;
    discoveryUsedForTurn = false;
  }
  if (action === "win" && run.currentBattle) {
    resolvePlayerWin(run, run.currentBattle);
    selectedTile = null;
    discoveryUsedForTurn = false;
  }
  if (action === "discover" && run.currentBattle && canUseDiscovery()) {
    useDiscovery(run.currentBattle);
  }
  if (action === "trial" && run.currentBattle) {
    makeTrialHand(run.currentBattle);
  }
  render();
}

function discardSelectedTile() {
  if (!run.currentBattle || selectedTile === null) return;
  discardTile(run, run.currentBattle, selectedTile);
  selectedTile = null;
  discoveryUsedForTurn = false;
  render();
}

function canUseDiscovery() {
  return run.currentBattle &&
    !discoveryUsedForTurn &&
    run.mandates.some((mandate) => ["useful-tile", "fortune-favored", "ready-boost", "pure-suit-crown"].includes(mandate.id));
}

function useDiscovery(battle) {
  const hints = suggestTiles(battle.playerHand);
  const replaceIndex = hints.findIndex((hint) => !hint.keep);
  const safeIndex = replaceIndex >= 0 ? replaceIndex : battle.playerHand.length - 1;
  const counts = new Map();
  for (const id of battle.playerHand) counts.set(id, (counts.get(id) ?? 0) + 1);
  const target = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "m5";
  battle.playerHand[safeIndex] = target;
  battle.playerHand = sortTiles(battle.playerHand);
  battle.lastAction = lang === "zh" ? `天命发现：一张孤牌变成了${tileInfo(target).label}。` : `Mandate discovery changed one isolated tile into ${tileLabel(target)}.`;
  discoveryUsedForTurn = true;
}

function makeTrialHand(battle) {
  battle.playerHand = sortTiles([
    "m1", "m2", "m3",
    "m2", "m3", "m4",
    "m5", "m6", "m7",
    "m7", "m8", "m9",
    "m5", "m5",
  ]);
  battle.lastAction = lang === "zh" ? "试炼牌型已成。" : "Trial winning hand is ready.";
}

function drawCanvas(now) {
  if (!ctx) return;
  const rect = app.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width;
  const h = rect.height;
  const bg = phase === "role" || !run.currentBattle ? images.title : images.table;

  if (bg.complete && bg.naturalWidth) {
    drawCoverImage(ctx, bg, w, h);
  } else {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h));
    gradient.addColorStop(0, "#18734a");
    gradient.addColorStop(1, "#061711");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.fillStyle = phase === "role" ? "rgba(0, 15, 16, 0.36)" : "rgba(0, 10, 14, 0.22)";
  ctx.fillRect(0, 0, w, h);
  drawAmbient(now, w, h);
  if (run.currentBattle) drawTableGlow(now, w, h);
}

function drawCoverImage(context, image, w, h) {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  context.drawImage(image, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function drawAmbient(now, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 14; i += 1) {
    const x = (Math.sin(now / 1800 + i * 1.7) * 0.5 + 0.5) * w;
    const y = (Math.cos(now / 2300 + i * 1.3) * 0.5 + 0.5) * h;
    ctx.fillStyle = `rgba(81, 214, 255, ${0.018 + (i % 3) * 0.009})`;
    ctx.beginPath();
    ctx.arc(x, y, 18 + (i % 5) * 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTableGlow(now, w, h) {
  const y = h * 0.72;
  const pulse = 0.45 + Math.sin(now / 700) * 0.15;
  const gradient = ctx.createRadialGradient(w / 2, y, 30, w / 2, y, w * 0.38);
  gradient.addColorStop(0, `rgba(81, 214, 255, ${pulse})`);
  gradient.addColorStop(0.34, "rgba(20, 95, 61, 0.25)");
  gradient.addColorStop(1, "rgba(20, 95, 61, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function animationLoop(now) {
  if (now - lastFrame > 33) {
    drawCanvas(now);
    lastFrame = now;
  }
  requestAnimationFrame(animationLoop);
}

window.addEventListener("resize", () => drawCanvas(performance.now()));
render();
requestAnimationFrame(animationLoop);
