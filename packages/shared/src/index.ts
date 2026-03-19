export type GameModule = {
  key: string;
  name: string;
  description: string;
};

export type RealmSeed = {
  code: string;
  name: string;
  order: number;
  requiredExp: number;
  breakthroughHp: number;
  breakthroughQi: number;
  majorRealm: "練氣" | "築基" | "金丹" | "元嬰" | "化神";
  minorStage: number;
  phase: "初期" | "中期" | "後期" | "圓滿";
};

export type ItemSeed = {
  code: string;
  name: string;
  category: "CONSUMABLE" | "MATERIAL" | "RECIPE" | "EQUIPMENT" | "SEED" | "QUEST";
  rarity: number;
  stackable: boolean;
  baseValue: number;
  description: string;
};

export type MonsterSeed = {
  code: string;
  name: string;
  level: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  rewardExp: number;
  rewardStone: number;
  realm: string;
  element: string;
  lootHint: string;
  isBoss?: boolean;
};

export type DungeonSeed = {
  code: string;
  name: string;
  description: string;
  staminaCost: number;
  minRealmOrder: number;
  monsterCode: string;
  rewardStone: number;
  recommendedRealm: string;
};

export type ShopSeed = {
  itemCode: string;
  price: number;
  stock: number | null;
  refreshHour: number | null;
};

export type AlchemyRecipeSeed = {
  code: string;
  name: string;
  resultName: string;
  resultQty: number;
  qiCost: number;
  successRate: number;
  ingredients: Array<{
    itemCode: string;
    quantity: number;
  }>;
};

export type CropSeed = {
  code: string;
  name: string;
  growthMinutes: number;
  yieldMin: number;
  yieldMax: number;
  requiredRealm: number;
};

export type ForgeRecipeSeed = {
  code: string;
  name: string;
  resultName: string;
  slot: "WEAPON" | "HELMET" | "ARMOR" | "RING" | "BOOTS" | "ACCESSORY";
  qiCost: number;
  successRate: number;
  materials: Array<{
    itemCode: string;
    quantity: number;
  }>;
};

export type OverviewSnapshot = {
  headline: string;
  setting: string;
  moduleCount: number;
  realmCount: number;
  dungeonCount: number;
  shopItemCount: number;
  recipeCount: number;
  cropCount: number;
  forgeRecipeCount: number;
  featuredRealms: RealmSeed[];
  featuredDungeons: DungeonSeed[];
  featuredShopItems: Array<ShopSeed & { itemName: string; category: string }>;
  featuredRecipes: Pick<AlchemyRecipeSeed, "code" | "name" | "resultName" | "successRate">[];
};

export const gameModules: GameModule[] = [
  {
    key: "cultivation",
    name: "修練升級",
    description: "透過功法掛機與靈石灌注累積修為，衝擊小境界與大境界突破。"
  },
  {
    key: "dungeons",
    name: "打怪副本",
    description: "挑戰妖獸洞窟、沼澤古道與白骨遺地，取得修為、靈石與材料。"
  },
  {
    key: "shop",
    name: "商店購買",
    description: "在坊市、丹鋪與黑市之間調度資源，建立你的經濟循環。"
  },
  {
    key: "alchemy",
    name: "煉丹系統",
    description: "收集藥材煉製回氣、護脈與突破輔丹，補足修練與戰鬥節奏。"
  },
  {
    key: "herbalism",
    name: "種藥養田",
    description: "經營藥田格位，安排成熟時間與收成節奏，穩定供應丹材。"
  },
  {
    key: "forging",
    name: "鍛造裝備",
    description: "消耗礦材與妖獸素材打造兵甲，補足攻防與身法差距。"
  }
];

const majorRealms: Array<RealmSeed["majorRealm"]> = ["練氣", "築基", "金丹", "元嬰", "化神"];

function getPhase(minorStage: number): RealmSeed["phase"] {
  if (minorStage <= 3) {
    return "初期";
  }

  if (minorStage <= 6) {
    return "中期";
  }

  if (minorStage <= 9) {
    return "後期";
  }

  return "圓滿";
}

export const realmSeeds: RealmSeed[] = (() => {
  const seeds: RealmSeed[] = [];
  let requiredExp = 100;
  let order = 1;

  for (let realmIndex = 0; realmIndex < majorRealms.length; realmIndex += 1) {
    const majorRealm = majorRealms[realmIndex];

    for (let minorStage = 1; minorStage <= 10; minorStage += 1) {
      if (!(realmIndex === 0 && minorStage === 1)) {
        const previousStageWasMajorPerfect = minorStage === 1;
        requiredExp = Math.ceil(requiredExp * (previousStageWasMajorPerfect ? 2 : 1.2));
      }

      seeds.push({
        code: `${majorRealm}-${minorStage}`,
        name: `${majorRealm}${minorStage}層`,
        order,
        requiredExp,
        breakthroughHp: 80 + order * 12,
        breakthroughQi: 45 + order * 8,
        majorRealm,
        minorStage,
        phase: getPhase(minorStage)
      });

      order += 1;
    }
  }

  return seeds;
})();

export const itemSeeds: ItemSeed[] = [
  {
    code: "qi_grass",
    name: "聚氣草",
    category: "MATERIAL",
    rarity: 1,
    stackable: true,
    baseValue: 18,
    description: "最常見的低階藥草，可用於回氣類丹藥。"
  },
  {
    code: "blood_flower",
    name: "血芽花",
    category: "MATERIAL",
    rarity: 1,
    stackable: true,
    baseValue: 18,
    description: "帶有微弱血氣的花材，是回血散的常用原料。"
  },
  {
    code: "dew_leaf",
    name: "凝露葉",
    category: "MATERIAL",
    rarity: 2,
    stackable: true,
    baseValue: 28,
    description: "晨露凝結的靈葉，可提升煉丹穩定度。"
  },
  {
    code: "calm_vine",
    name: "寧神藤",
    category: "MATERIAL",
    rarity: 2,
    stackable: true,
    baseValue: 42,
    description: "能穩定神識與氣機，常用於護脈丹與凝神丹。"
  },
  {
    code: "flame_fruit",
    name: "焰心果",
    category: "MATERIAL",
    rarity: 3,
    stackable: true,
    baseValue: 64,
    description: "火性濃厚的靈果，能大幅提高鍛造與丹火效率。"
  },
  {
    code: "jade_shroom",
    name: "玉髓芝",
    category: "MATERIAL",
    rarity: 4,
    stackable: true,
    baseValue: 120,
    description: "築基以上才會接觸到的靈芝，可作為高階突破輔材。"
  },
  {
    code: "iron_ore",
    name: "寒鐵礦",
    category: "MATERIAL",
    rarity: 1,
    stackable: true,
    baseValue: 14,
    description: "鍛造低階武器與護甲的基礎礦材。"
  },
  {
    code: "dark_sand",
    name: "烏砂",
    category: "MATERIAL",
    rarity: 1,
    stackable: true,
    baseValue: 10,
    description: "可與寒鐵礦混合使用，增加鍛造成形率。"
  },
  {
    code: "red_copper",
    name: "赤銅",
    category: "MATERIAL",
    rarity: 2,
    stackable: true,
    baseValue: 45,
    description: "偏火性的鍛造材料，常見於築基區域礦脈。"
  },
  {
    code: "green_iron",
    name: "青鋼",
    category: "MATERIAL",
    rarity: 3,
    stackable: true,
    baseValue: 90,
    description: "耐性與鋒利兼具的稀有礦材，可強化高品質裝備。"
  },
  {
    code: "beast_bone",
    name: "妖骨",
    category: "MATERIAL",
    rarity: 1,
    stackable: true,
    baseValue: 12,
    description: "妖獸遺留下的骨材，可做為鍛造和任務素材。"
  },
  {
    code: "monster_hide",
    name: "獸皮",
    category: "MATERIAL",
    rarity: 1,
    stackable: true,
    baseValue: 12,
    description: "常見妖獸皮革，可製作護腕與輕甲。"
  },
  {
    code: "qi_powder",
    name: "回氣散",
    category: "CONSUMABLE",
    rarity: 1,
    stackable: true,
    baseValue: 20,
    description: "戰鬥後或修練前服用，可恢復少量靈氣。"
  },
  {
    code: "blood_powder",
    name: "補血散",
    category: "CONSUMABLE",
    rarity: 1,
    stackable: true,
    baseValue: 20,
    description: "簡單療傷丹藥，適合新手副本使用。"
  },
  {
    code: "nourish_yuan_pill",
    name: "養元丹",
    category: "CONSUMABLE",
    rarity: 2,
    stackable: true,
    baseValue: 65,
    description: "修練中服用可提高掛機修為收益。"
  },
  {
    code: "guard_meridian_pill",
    name: "護脈丹",
    category: "CONSUMABLE",
    rarity: 3,
    stackable: true,
    baseValue: 120,
    description: "突破大境界前常備的護脈丹，可降低失敗損耗。"
  },
  {
    code: "spirit_condense_pill",
    name: "凝神丹",
    category: "CONSUMABLE",
    rarity: 3,
    stackable: true,
    baseValue: 150,
    description: "可提升神識穩定度與煉丹成功率。"
  },
  {
    code: "novice_sword",
    name: "青木短劍",
    category: "EQUIPMENT",
    rarity: 1,
    stackable: false,
    baseValue: 60,
    description: "最基礎的低階法劍，適合練氣期使用。"
  },
  {
    code: "novice_robe",
    name: "玄布法袍",
    category: "EQUIPMENT",
    rarity: 1,
    stackable: false,
    baseValue: 58,
    description: "提供基礎防護與少量靈氣導引。"
  },
  {
    code: "swift_boots",
    name: "逐風靴",
    category: "EQUIPMENT",
    rarity: 2,
    stackable: false,
    baseValue: 92,
    description: "提升身法與先手能力的低階身法裝。"
  },
  {
    code: "field_seed_qi_grass",
    name: "聚氣草種",
    category: "SEED",
    rarity: 1,
    stackable: true,
    baseValue: 8,
    description: "可種植於藥田，成熟後收成聚氣草。"
  },
  {
    code: "field_seed_blood_flower",
    name: "血芽花種",
    category: "SEED",
    rarity: 1,
    stackable: true,
    baseValue: 8,
    description: "可種植於藥田，成熟後收成血芽花。"
  }
];

export const monsterSeeds: MonsterSeed[] = [
  {
    code: "green_wolf",
    name: "青牙狼",
    level: 2,
    hp: 90,
    attack: 16,
    defense: 8,
    speed: 14,
    rewardExp: 20,
    rewardStone: 6,
    realm: "練氣二層",
    element: "木",
    lootHint: "獸皮、妖骨"
  },
  {
    code: "ash_rat",
    name: "灰尾鼠妖",
    level: 1,
    hp: 68,
    attack: 12,
    defense: 6,
    speed: 18,
    rewardExp: 16,
    rewardStone: 4,
    realm: "練氣一層",
    element: "土",
    lootHint: "低階雜材"
  },
  {
    code: "swamp_snake",
    name: "沼鱗蛇",
    level: 3,
    hp: 120,
    attack: 21,
    defense: 10,
    speed: 12,
    rewardExp: 28,
    rewardStone: 8,
    realm: "練氣三層",
    element: "水",
    lootHint: "毒囊、蛇皮"
  },
  {
    code: "fire_monkey",
    name: "熾火猿",
    level: 4,
    hp: 138,
    attack: 28,
    defense: 12,
    speed: 16,
    rewardExp: 34,
    rewardStone: 10,
    realm: "練氣四層",
    element: "火",
    lootHint: "焰心果、獸骨"
  },
  {
    code: "bone_crow",
    name: "白骨烏",
    level: 5,
    hp: 154,
    attack: 30,
    defense: 14,
    speed: 20,
    rewardExp: 38,
    rewardStone: 12,
    realm: "練氣五層",
    element: "金",
    lootHint: "陰骨羽"
  },
  {
    code: "black_wind_wolf",
    name: "黑風狼王",
    level: 6,
    hp: 260,
    attack: 42,
    defense: 20,
    speed: 24,
    rewardExp: 72,
    rewardStone: 26,
    realm: "練氣六層",
    element: "木",
    lootHint: "狼王牙、黑風骨",
    isBoss: true
  },
  {
    code: "bone_guard",
    name: "白骨衛",
    level: 12,
    hp: 420,
    attack: 58,
    defense: 28,
    speed: 18,
    rewardExp: 110,
    rewardStone: 40,
    realm: "築基二層",
    element: "金",
    lootHint: "陰骨甲片"
  },
  {
    code: "blood_bat",
    name: "血翼蝠",
    level: 13,
    hp: 390,
    attack: 54,
    defense: 22,
    speed: 30,
    rewardExp: 120,
    rewardStone: 42,
    realm: "築基三層",
    element: "火",
    lootHint: "血翼、妖血"
  },
  {
    code: "mist_spirit",
    name: "霧靈",
    level: 14,
    hp: 360,
    attack: 64,
    defense: 20,
    speed: 32,
    rewardExp: 128,
    rewardStone: 45,
    realm: "築基四層",
    element: "水",
    lootHint: "迷霧靈核"
  },
  {
    code: "ore_beast",
    name: "礦甲獸",
    level: 15,
    hp: 520,
    attack: 62,
    defense: 36,
    speed: 16,
    rewardExp: 138,
    rewardStone: 52,
    realm: "築基五層",
    element: "土",
    lootHint: "赤銅、寒鐵礦"
  },
  {
    code: "bone_general",
    name: "白骨將",
    level: 16,
    hp: 700,
    attack: 80,
    defense: 42,
    speed: 24,
    rewardExp: 180,
    rewardStone: 88,
    realm: "築基六層",
    element: "金",
    lootHint: "骨將戰盔碎片",
    isBoss: true
  }
];

export const dungeonSeeds: DungeonSeed[] = [
  {
    code: "kuteng_valley",
    name: "枯藤谷",
    description: "散修初入修真界最常踏入的練氣副本，能穩定取得低階材料。",
    staminaCost: 5,
    minRealmOrder: 1,
    monsterCode: "ash_rat",
    rewardStone: 20,
    recommendedRealm: "練氣一層 - 練氣三層"
  },
  {
    code: "black_wind_cave",
    name: "黑風洞",
    description: "黑風狼群盤踞之地，速度型妖獸會壓迫行動條節奏。",
    staminaCost: 6,
    minRealmOrder: 3,
    monsterCode: "black_wind_wolf",
    rewardStone: 35,
    recommendedRealm: "練氣三層 - 練氣六層"
  },
  {
    code: "abandoned_field",
    name: "荒田廢墟",
    description: "殘破靈田與殘留禁制交錯，適合收集低階種藥素材。",
    staminaCost: 5,
    minRealmOrder: 2,
    monsterCode: "swamp_snake",
    rewardStone: 28,
    recommendedRealm: "練氣二層 - 練氣四層"
  },
  {
    code: "white_bone_marsh",
    name: "白骨沼",
    description: "築基修士才敢久留的陰地，敵人多為高防或高速的詭異妖物。",
    staminaCost: 8,
    minRealmOrder: 11,
    monsterCode: "bone_general",
    rewardStone: 78,
    recommendedRealm: "築基一層 - 築基六層"
  }
];

export const shopSeeds: ShopSeed[] = [
  { itemCode: "qi_grass", price: 18, stock: null, refreshHour: null },
  { itemCode: "blood_flower", price: 18, stock: null, refreshHour: null },
  { itemCode: "field_seed_qi_grass", price: 6, stock: null, refreshHour: null },
  { itemCode: "field_seed_blood_flower", price: 6, stock: null, refreshHour: null },
  { itemCode: "qi_powder", price: 20, stock: null, refreshHour: null },
  { itemCode: "blood_powder", price: 20, stock: null, refreshHour: null },
  { itemCode: "nourish_yuan_pill", price: 65, stock: 3, refreshHour: 12 },
  { itemCode: "guard_meridian_pill", price: 120, stock: 1, refreshHour: 24 },
  { itemCode: "spirit_condense_pill", price: 150, stock: 1, refreshHour: 24 },
  { itemCode: "iron_ore", price: 14, stock: null, refreshHour: null },
  { itemCode: "dark_sand", price: 10, stock: null, refreshHour: null },
  { itemCode: "red_copper", price: 45, stock: 5, refreshHour: 12 },
  { itemCode: "green_iron", price: 90, stock: 2, refreshHour: 24 },
  { itemCode: "novice_sword", price: 60, stock: 2, refreshHour: 24 },
  { itemCode: "novice_robe", price: 58, stock: 2, refreshHour: 24 },
  { itemCode: "swift_boots", price: 92, stock: 1, refreshHour: 24 }
];

export const alchemyRecipeSeeds: AlchemyRecipeSeed[] = [
  {
    code: "recipe_qi_powder",
    name: "回氣散丹方",
    resultName: "回氣散",
    resultQty: 1,
    qiCost: 12,
    successRate: 92,
    ingredients: [
      { itemCode: "qi_grass", quantity: 2 },
      { itemCode: "dew_leaf", quantity: 1 }
    ]
  },
  {
    code: "recipe_blood_powder",
    name: "補血散丹方",
    resultName: "補血散",
    resultQty: 1,
    qiCost: 12,
    successRate: 90,
    ingredients: [
      { itemCode: "blood_flower", quantity: 2 },
      { itemCode: "dew_leaf", quantity: 1 }
    ]
  },
  {
    code: "recipe_nourish_yuan_pill",
    name: "養元丹丹方",
    resultName: "養元丹",
    resultQty: 1,
    qiCost: 20,
    successRate: 78,
    ingredients: [
      { itemCode: "qi_grass", quantity: 3 },
      { itemCode: "calm_vine", quantity: 1 },
      { itemCode: "dew_leaf", quantity: 1 }
    ]
  },
  {
    code: "recipe_guard_meridian_pill",
    name: "護脈丹丹方",
    resultName: "護脈丹",
    resultQty: 1,
    qiCost: 28,
    successRate: 66,
    ingredients: [
      { itemCode: "calm_vine", quantity: 2 },
      { itemCode: "jade_shroom", quantity: 1 }
    ]
  }
];

export const cropSeeds: CropSeed[] = [
  {
    code: "crop_qi_grass",
    name: "聚氣草",
    growthMinutes: 30,
    yieldMin: 2,
    yieldMax: 4,
    requiredRealm: 1
  },
  {
    code: "crop_blood_flower",
    name: "血芽花",
    growthMinutes: 40,
    yieldMin: 2,
    yieldMax: 4,
    requiredRealm: 1
  },
  {
    code: "crop_dew_leaf",
    name: "凝露葉",
    growthMinutes: 45,
    yieldMin: 1,
    yieldMax: 3,
    requiredRealm: 1
  },
  {
    code: "crop_calm_vine",
    name: "寧神藤",
    growthMinutes: 90,
    yieldMin: 2,
    yieldMax: 3,
    requiredRealm: 11
  },
  {
    code: "crop_flame_fruit",
    name: "焰心果",
    growthMinutes: 120,
    yieldMin: 1,
    yieldMax: 3,
    requiredRealm: 11
  }
];

export const forgeRecipeSeeds: ForgeRecipeSeed[] = [
  {
    code: "forge_novice_sword",
    name: "青木短劍圖",
    resultName: "青木短劍",
    slot: "WEAPON",
    qiCost: 14,
    successRate: 88,
    materials: [
      { itemCode: "iron_ore", quantity: 3 },
      { itemCode: "dark_sand", quantity: 1 }
    ]
  },
  {
    code: "forge_novice_robe",
    name: "玄布法袍圖",
    resultName: "玄布法袍",
    slot: "ARMOR",
    qiCost: 12,
    successRate: 86,
    materials: [
      { itemCode: "monster_hide", quantity: 3 },
      { itemCode: "beast_bone", quantity: 1 }
    ]
  },
  {
    code: "forge_swift_boots",
    name: "逐風靴圖",
    resultName: "逐風靴",
    slot: "BOOTS",
    qiCost: 18,
    successRate: 74,
    materials: [
      { itemCode: "monster_hide", quantity: 2 },
      { itemCode: "red_copper", quantity: 1 },
      { itemCode: "beast_bone", quantity: 2 }
    ]
  }
];

export const overviewSnapshot: OverviewSnapshot = {
  headline: "凡人流文字修仙",
  setting:
    "靈氣衰退、資源緊縮、宗門與坊市角力的修真亂世。玩家以散修身分求生，在副本、商店、生產與突破之間安排自己的長線節奏。",
  moduleCount: gameModules.length,
  realmCount: realmSeeds.length,
  dungeonCount: dungeonSeeds.length,
  shopItemCount: shopSeeds.length,
  recipeCount: alchemyRecipeSeeds.length,
  cropCount: cropSeeds.length,
  forgeRecipeCount: forgeRecipeSeeds.length,
  featuredRealms: realmSeeds.slice(0, 5),
  featuredDungeons: dungeonSeeds.slice(0, 3),
  featuredShopItems: shopSeeds.slice(0, 6).map((entry) => {
    const item = itemSeeds.find((candidate) => candidate.code === entry.itemCode);

    return {
      ...entry,
      itemName: item?.name ?? entry.itemCode,
      category: item?.category ?? "MATERIAL"
    };
  }),
  featuredRecipes: alchemyRecipeSeeds.map((recipe) => ({
    code: recipe.code,
    name: recipe.name,
    resultName: recipe.resultName,
    successRate: recipe.successRate
  }))
};
