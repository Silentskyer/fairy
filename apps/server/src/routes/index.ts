import type { FastifyInstance, FastifyReply } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import {
  alchemyRecipeSeeds,
  cropSeeds,
  dungeonSeeds,
  forgeRecipeSeeds,
  gameModules,
  itemSeeds,
  overviewSnapshot,
  realmSeeds,
  shopSeeds
} from "@fairy/shared";
import { hashPassword, requireAuth, verifyPassword } from "../lib/auth.js";
import { getPrismaClient } from "../lib/prisma.js";

const DB_MESSAGE = "Database is not configured. Set DATABASE_URL first.";

const registerSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 chars")
});

const createCharacterSchema = z.object({
  name: z.string().min(2).max(12),
  rootBone: z.number().int().min(8).max(20).default(12),
  comprehension: z.number().int().min(8).max(20).default(12)
});

const cultivateSchema = z.object({
  mode: z.enum(["MANUAL_STONE", "MANUAL_GONGFA"]),
  minutes: z.number().int().min(5).max(720).optional(),
  spiritStoneSpend: z.number().int().min(1).max(5000).optional()
});

const dungeonEnterSchema = z.object({
  characterId: z.string().min(1)
});

const purchaseSchema = z.object({
  characterId: z.string().min(1),
  shopItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(20).default(1)
});

const alchemyBatchSchema = z.object({
  characterId: z.string().min(1),
  recipeCode: z.string().min(1)
});

const plantSchema = z.object({
  characterId: z.string().min(1),
  plotId: z.string().min(1),
  cropCode: z.string().min(1)
});

const harvestSchema = z.object({
  characterId: z.string().min(1),
  plotId: z.string().min(1)
});

const forgeBatchSchema = z.object({
  characterId: z.string().min(1),
  recipeCode: z.string().min(1)
});

const rewardClaimSchema = z.object({
  characterId: z.string().min(1)
});

const questTargets = {
  quest_enter_first_dungeon: 1,
  quest_buy_first_item: 1,
  quest_brew_first_pill: 1,
  quest_harvest_first_herb: 1,
  quest_forge_first_item: 1
} as const;

const questDefs = [
  { code: "quest_enter_first_dungeon", name: "First Dungeon", description: "Clear one dungeon.", rewardStone: 20, rewardExp: 25 },
  { code: "quest_buy_first_item", name: "First Trade", description: "Buy one shop item.", rewardStone: 15, rewardExp: 15 },
  { code: "quest_brew_first_pill", name: "First Pill", description: "Complete one successful alchemy batch.", rewardStone: 20, rewardExp: 35 },
  { code: "quest_harvest_first_herb", name: "First Harvest", description: "Harvest one planted crop.", rewardStone: 20, rewardExp: 25 },
  { code: "quest_forge_first_item", name: "First Forge", description: "Complete one successful forge batch.", rewardStone: 25, rewardExp: 35 }
] as const;

const achievementDefs = [
  { code: "achievement_first_breakthrough", name: "First Breakthrough", description: "Reach the next small stage.", rewardStone: 30 },
  { code: "achievement_dungeon_victor", name: "Dungeon Victor", description: "Win 3 dungeon runs.", rewardStone: 40 },
  { code: "achievement_alchemy_apprentice", name: "Alchemy Apprentice", description: "Win 3 alchemy batches.", rewardStone: 35 }
] as const;

function useDb(reply: FastifyReply) {
  const prisma = getPrismaClient();
  if (!prisma) {
    reply.code(503).send({ message: DB_MESSAGE });
    return null;
  }
  return prisma;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function cultivationGain(input: z.infer<typeof cultivateSchema>, comprehension: number) {
  if (input.mode === "MANUAL_GONGFA") {
    const minutes = input.minutes ?? 60;
    return Math.max(1, Math.floor(minutes * (1 + comprehension / 100)));
  }
  const spend = input.spiritStoneSpend ?? 10;
  return spend * 4 + Math.floor(comprehension / 2);
}

async function getOverview() {
  const prisma = getPrismaClient();
  if (!prisma) return overviewSnapshot;

  const [realmCount, dungeonCount, shopItemCount, recipeCount, cropCount, forgeRecipeCount] = await Promise.all([
    prisma.realmLevel.count(),
    prisma.dungeonDef.count(),
    prisma.shopItem.count(),
    prisma.alchemyRecipe.count(),
    prisma.cropDef.count(),
    prisma.forgeRecipe.count()
  ]);

  return { ...overviewSnapshot, realmCount, dungeonCount, shopItemCount, recipeCount, cropCount, forgeRecipeCount };
}

async function ownedCharacter(prisma: PrismaClient, userId: string, characterId: string) {
  return prisma.character.findFirst({
    where: { id: characterId, userId },
    include: { realmLevel: true }
  });
}

async function changeInventory(prisma: PrismaClient, characterId: string, itemDefId: string, delta: number) {
  const existing = await prisma.inventorySlot.findUnique({
    where: { characterId_itemDefId: { characterId, itemDefId } }
  });

  if (!existing) {
    if (delta < 0) return false;
    await prisma.inventorySlot.create({ data: { characterId, itemDefId, quantity: delta } });
    return true;
  }

  const nextQuantity = existing.quantity + delta;
  if (nextQuantity < 0) return false;
  if (nextQuantity === 0) {
    await prisma.inventorySlot.delete({ where: { id: existing.id } });
    return true;
  }

  await prisma.inventorySlot.update({ where: { id: existing.id }, data: { quantity: nextQuantity } });
  return true;
}

async function itemByCode(prisma: PrismaClient, code: string) {
  return prisma.itemDef.findUnique({ where: { code } });
}

async function itemByName(prisma: PrismaClient, name: string) {
  return prisma.itemDef.findFirst({ where: { name } });
}

async function awardItem(
  prisma: PrismaClient,
  characterId: string,
  item: Awaited<ReturnType<typeof itemByCode>> | Awaited<ReturnType<typeof itemByName>>,
  quantity: number,
  quality = 1,
  equipmentSlot: "WEAPON" | "HELMET" | "ARMOR" | "RING" | "BOOTS" | "ACCESSORY" = "WEAPON"
) {
  if (!item || quantity <= 0) return;

  if (item.category === "EQUIPMENT") {
    for (let index = 0; index < quantity; index += 1) {
      await prisma.equipmentInstance.create({
        data: {
          characterId,
          itemDefId: item.id,
          slot: equipmentSlot,
          name: item.name,
          quality,
          attackBonus: equipmentSlot === "WEAPON" ? 4 * quality : quality,
          defenseBonus: equipmentSlot === "ARMOR" ? 4 * quality : quality,
          agilityBonus: equipmentSlot === "BOOTS" ? 3 * quality : quality,
          durability: 100
        }
      });
    }
    return;
  }

  await changeInventory(prisma, characterId, item.id, quantity);
}

async function applyRealmProgress(characterId: string, startingExp: number) {
  const prisma = getPrismaClient();
  if (!prisma) return null;

  let currentCharacter = await prisma.character.findUniqueOrThrow({
    where: { id: characterId },
    include: { realmLevel: true }
  });

  let currentExp = startingExp;
  let promoted = false;

  while (true) {
    const nextRealm = await prisma.realmLevel.findFirst({
      where: { order: currentCharacter.realmLevel.order + 1 }
    });

    if (!nextRealm || currentExp < nextRealm.requiredExp) break;

    promoted = true;
    currentCharacter = await prisma.character.update({
      where: { id: characterId },
      data: {
        realmLevelId: nextRealm.id,
        level: nextRealm.order,
        maxHp: { increment: 12 },
        hp: { increment: 12 },
        maxQi: { increment: 8 },
        qi: { increment: 8 },
        attack: { increment: 3 },
        defense: { increment: 2 },
        agility: { increment: 2 }
      },
      include: { realmLevel: true }
    });
  }

  return { character: currentCharacter, promoted };
}

async function ensureProgressionDefs(prisma: PrismaClient) {
  for (const quest of questDefs) {
    await prisma.questDef.upsert({
      where: { code: quest.code },
      update: quest,
      create: quest
    });
  }

  for (const achievement of achievementDefs) {
    await prisma.achievementDef.upsert({
      where: { code: achievement.code },
      update: achievement,
      create: achievement
    });
  }
}

async function ensureCharacterProgression(prisma: PrismaClient, characterId: string) {
  await ensureProgressionDefs(prisma);

  const [quests, achievements] = await Promise.all([prisma.questDef.findMany(), prisma.achievementDef.findMany()]);

  for (const quest of quests) {
    await prisma.characterQuest.upsert({
      where: { characterId_questDefId: { characterId, questDefId: quest.id } },
      update: {},
      create: { characterId, questDefId: quest.id, status: "ACTIVE" }
    });
  }

  for (const achievement of achievements) {
    await prisma.characterAchievement.upsert({
      where: { characterId_achievementDefId: { characterId, achievementDefId: achievement.id } },
      update: {},
      create: { characterId, achievementDefId: achievement.id }
    });
  }
}

async function advanceQuest(prisma: PrismaClient, characterId: string, code: keyof typeof questTargets, delta = 1) {
  const questDef = await prisma.questDef.findUnique({ where: { code } });
  if (!questDef) return;

  const current = await prisma.characterQuest.findUnique({
    where: { characterId_questDefId: { characterId, questDefId: questDef.id } }
  });

  if (!current || current.status === "CLAIMED") return;

  const progress = current.progress + delta;
  const done = progress >= questTargets[code];

  await prisma.characterQuest.update({
    where: { id: current.id },
    data: {
      progress,
      status: done ? "COMPLETED" : "ACTIVE",
      completedAt: done ? new Date() : current.completedAt
    }
  });
}

async function syncAchievements(prisma: PrismaClient, characterId: string) {
  const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
  const dungeonWins = await prisma.dungeonRun.count({ where: { characterId, success: true } });
  const alchemyWins = await prisma.alchemyBatch.count({ where: { characterId, status: "SUCCESS" } });
  const defs = await prisma.achievementDef.findMany();

  for (const def of defs) {
    const entry = await prisma.characterAchievement.findUnique({
      where: { characterId_achievementDefId: { characterId, achievementDefId: def.id } }
    });

    if (!entry || entry.unlockedAt) continue;

    let unlocked = false;
    if (def.code === "achievement_first_breakthrough") unlocked = character.level >= 2;
    if (def.code === "achievement_dungeon_victor") unlocked = dungeonWins >= 3;
    if (def.code === "achievement_alchemy_apprentice") unlocked = alchemyWins >= 3;

    if (unlocked) {
      await prisma.characterAchievement.update({
        where: { id: entry.id },
        data: { unlockedAt: new Date() }
      });
    }
  }
}

function deriveTitles(realmOrder: number, claimedAchievements: number, claimedQuests: number) {
  const titles = ["Wandering Cultivator"];
  if (realmOrder >= 11) titles.push("Foundation Adept");
  else if (realmOrder >= 2) titles.push("New Disciple");
  if (claimedAchievements >= 1) titles.push("Known Name");
  if (claimedQuests >= 3) titles.push("Market Walker");
  return titles;
}

function simulateBattle(character: { attack: number; defense: number; agility: number; hp: number }, monster: { attack: number; defense: number; speed: number; hp: number }) {
  let charHp = character.hp;
  let monsterHp = monster.hp;
  let charGauge = 0;
  let monsterGauge = 0;
  let turns = 0;
  const logs: Array<{ actor: string; action: string; value: number }> = [];

  while (charHp > 0 && monsterHp > 0 && turns < 30) {
    charGauge += Math.max(60, character.agility * 12);
    monsterGauge += Math.max(60, monster.speed * 12);

    let actor: "character" | "monster" | null = null;
    if (charGauge >= 1000 && charGauge >= monsterGauge) {
      actor = "character";
      charGauge -= 1000;
    } else if (monsterGauge >= 1000) {
      actor = "monster";
      monsterGauge -= 1000;
    }

    if (!actor) continue;

    turns += 1;

    if (actor === "character") {
      const damage = Math.max(1, character.attack * 2 - monster.defense);
      monsterHp -= damage;
      logs.push({ actor, action: "attack", value: damage });
    } else {
      const damage = Math.max(1, monster.attack * 2 - character.defense);
      charHp -= damage;
      logs.push({ actor, action: "attack", value: damage });
    }
  }

  return { success: monsterHp <= 0, turns, remainingHp: Math.max(1, charHp), logs };
}

function lootPool(monsterCode: string) {
  if (monsterCode.includes("wolf")) return ["monster_hide", "beast_bone"];
  if (monsterCode.includes("snake")) return ["blood_flower", "dew_leaf"];
  if (monsterCode.includes("bone")) return ["beast_bone", "green_iron"];
  return ["qi_grass"];
}

export async function registerRoutes(app: FastifyInstance) {
  app.get("/api", async () => ({
    name: "Fairy Cultivation API",
    modules: gameModules,
    mode: process.env.DATABASE_URL ? "database" : "seed"
  }));

  app.get("/api/overview", async () => getOverview());
  app.get("/api/modules", async () => gameModules);

  app.get("/api/realms", async () => {
    const prisma = getPrismaClient();
    if (!prisma) return realmSeeds;
    return prisma.realmLevel.findMany({ orderBy: { order: "asc" } });
  });

  app.get("/api/dungeons", async () => {
    const prisma = getPrismaClient();
    if (!prisma) return dungeonSeeds;
    return prisma.dungeonDef.findMany({ include: { monster: true }, orderBy: { minRealmOrder: "asc" } });
  });

  app.get("/api/shop-items", async () => {
    const prisma = getPrismaClient();
    if (!prisma) {
      return shopSeeds.map((entry) => {
        const item = itemSeeds.find((candidate) => candidate.code === entry.itemCode);
        return {
          shopItemId: entry.itemCode,
          itemCode: entry.itemCode,
          itemName: item?.name ?? entry.itemCode,
          category: item?.category ?? "MATERIAL",
          price: entry.price,
          stock: entry.stock,
          refreshHour: entry.refreshHour
        };
      });
    }

    const shopItems = await prisma.shopItem.findMany({
      include: { itemDef: true },
      orderBy: { price: "asc" }
    });

    return shopItems.map((entry) => ({
      shopItemId: entry.id,
      itemCode: entry.itemDef.code,
      itemName: entry.itemDef.name,
      category: entry.itemDef.category,
      price: entry.price,
      stock: entry.stock,
      refreshHour: entry.refreshHour
    }));
  });

  app.get("/api/alchemy/recipes", async () => {
    const prisma = getPrismaClient();
    if (!prisma) return alchemyRecipeSeeds;
    return prisma.alchemyRecipe.findMany({
      include: { ingredients: { include: { itemDef: true } } },
      orderBy: { successRate: "desc" }
    });
  });

  app.get("/api/crops", async () => {
    const prisma = getPrismaClient();
    if (!prisma) return cropSeeds;
    return prisma.cropDef.findMany({ orderBy: { requiredRealm: "asc" } });
  });

  app.get("/api/forge/recipes", async () => {
    const prisma = getPrismaClient();
    if (!prisma) return forgeRecipeSeeds;
    return prisma.forgeRecipe.findMany({ include: { materials: { include: { itemDef: true } } } });
  });

  app.post("/api/auth/register", async (request, reply) => {
    const prisma = useDb(reply);
    if (!prisma) return;

    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: parsed.error.issues[0]?.message ?? "Bad request" });

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return reply.code(409).send({ message: "Email already exists" });

    const user = await prisma.user.create({
      data: { email: parsed.data.email, passwordHash: hashPassword(parsed.data.password) }
    });

    const token = await reply.jwtSign({ id: user.id, email: user.email });
    return { token, user: { id: user.id, email: user.email } };
  });

  app.post("/api/auth/login", async (request, reply) => {
    const prisma = useDb(reply);
    if (!prisma) return;

    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: parsed.error.issues[0]?.message ?? "Bad request" });

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return reply.code(401).send({ message: "Invalid credentials" });
    }

    const token = await reply.jwtSign({ id: user.id, email: user.email });
    return { token, user: { id: user.id, email: user.email } };
  });

  app.get("/api/me", async (request, reply) => {
    const authorized = await requireAuth(request, reply);
    if (!authorized) return;
    return { user: request.user };
  });

  app.get("/api/characters", async (request, reply) => {
    const authorized = await requireAuth(request, reply);
    if (!authorized) return;
    const prisma = useDb(reply);
    if (!prisma) return;
    return prisma.character.findMany({
      where: { userId: request.user.id },
      include: { realmLevel: true },
      orderBy: { createdAt: "asc" }
    });
  });

  app.get("/api/characters/:id", async (request, reply) => {
    const authorized = await requireAuth(request, reply);
    if (!authorized) return;
    const prisma = useDb(reply);
    if (!prisma) return;

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: "Bad params" });

    const character = await prisma.character.findFirst({
      where: { id: params.data.id, userId: request.user.id },
      include: {
        realmLevel: true,
        inventorySlots: { include: { itemDef: true } },
        herbPlots: { include: { cropDef: true } },
        equipmentInstances: true
      }
    });

    if (!character) return reply.code(404).send({ message: "Character not found" });
    return character;
  });

  app.post("/api/characters", async (request, reply) => {
    const authorized = await requireAuth(request, reply);
    if (!authorized) return;
    const prisma = useDb(reply);
    if (!prisma) return;

    const parsed = createCharacterSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: parsed.error.issues[0]?.message ?? "Bad request" });

    const existing = await prisma.character.findUnique({ where: { name: parsed.data.name } });
    if (existing) return reply.code(409).send({ message: "Character name exists" });

    const firstRealm = await prisma.realmLevel.findFirst({ orderBy: { order: "asc" } });
    if (!firstRealm) return reply.code(500).send({ message: "Run seed first" });

    const created = await prisma.character.create({
      data: {
        userId: request.user.id,
        name: parsed.data.name,
        realmLevelId: firstRealm.id,
        level: firstRealm.order,
        spiritStone: 120,
        hp: 100 + parsed.data.rootBone * 2,
        maxHp: 100 + parsed.data.rootBone * 2,
        qi: 60 + parsed.data.comprehension,
        maxQi: 60 + parsed.data.comprehension,
        attack: 10 + Math.floor(parsed.data.rootBone / 2),
        defense: 8 + Math.floor(parsed.data.rootBone / 3),
        agility: 8 + Math.floor(parsed.data.comprehension / 3),
        comprehension: parsed.data.comprehension,
        rootBone: parsed.data.rootBone,
        herbPlots: {
          create: [
            { slotIndex: 1, isUnlocked: true },
            { slotIndex: 2, isUnlocked: true },
            { slotIndex: 3, isUnlocked: false }
          ]
        }
      },
      include: { realmLevel: true, herbPlots: true }
    });

    const starterCodes = ["qi_powder", "blood_powder", "field_seed_qi_grass"];
    for (const code of starterCodes) {
      const item = await itemByCode(prisma, code);
      if (item) await changeInventory(prisma, created.id, item.id, code === "field_seed_qi_grass" ? 3 : 2);
    }

    await ensureCharacterProgression(prisma, created.id);
    return reply.code(201).send(created);
  });

  app.post("/api/characters/:id/cultivate", async (request, reply) => {
    const authorized = await requireAuth(request, reply);
    if (!authorized) return;
    const prisma = useDb(reply);
    if (!prisma) return;

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    const parsed = cultivateSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ message: "Bad request" });

    const character = await ownedCharacter(prisma, request.user.id, params.data.id);
    if (!character) return reply.code(404).send({ message: "Character not found" });

    if (parsed.data.mode === "MANUAL_STONE") {
      const spend = parsed.data.spiritStoneSpend ?? 10;
      if (character.spiritStone < spend) return reply.code(400).send({ message: "Not enough spirit stones" });
    }

    const gain = cultivationGain(parsed.data, character.comprehension);
    const updated = await prisma.character.update({
      where: { id: character.id },
      data: {
        experience: { increment: gain },
        spiritStone: parsed.data.mode === "MANUAL_STONE" ? { decrement: parsed.data.spiritStoneSpend ?? 10 } : undefined,
        qi: parsed.data.mode === "MANUAL_GONGFA" ? { decrement: Math.min(character.qi, Math.max(5, Math.floor(gain / 8))) } : undefined
      },
      include: { realmLevel: true }
    });

    const progressed = await applyRealmProgress(updated.id, updated.experience);
    await syncAchievements(prisma, updated.id);

    return {
      message: parsed.data.mode === "MANUAL_STONE" ? "Stone cultivation complete" : "Gongfa cultivation complete",
      gain,
      promoted: progressed?.promoted ?? false,
      character: progressed?.character ?? updated
    };
  });

  app.post("/api/dungeons/:id/enter", async (request, reply) => {
    const authorized = await requireAuth(request, reply);
    if (!authorized) return;
    const prisma = useDb(reply);
    if (!prisma) return;

    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    const body = dungeonEnterSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ message: "Bad request" });

    const [character, dungeon] = await Promise.all([
      ownedCharacter(prisma, request.user.id, body.data.characterId),
      prisma.dungeonDef.findUnique({ where: { id: params.data.id }, include: { monster: true } })
    ]);

    if (!character) return reply.code(404).send({ message: "Character not found" });
    if (!dungeon) return reply.code(404).send({ message: "Dungeon not found" });
    if (character.level < dungeon.minRealmOrder) return reply.code(400).send({ message: "Realm is too low" });

    const run = await prisma.dungeonRun.create({ data: { characterId: character.id, dungeonDefId: dungeon.id } });
    const battle = simulateBattle(character, dungeon.monster);
    const rewardExp = battle.success ? dungeon.monster.rewardExp : 0;
    const rewardStone = battle.success ? dungeon.rewardStone + dungeon.monster.rewardStone : 0;

    for (let index = 0; index < battle.logs.length; index += 1) {
      await prisma.battleLog.create({
        data: {
          characterId: character.id,
          dungeonRunId: run.id,
          monsterId: dungeon.monster.id,
          turn: index + 1,
          actor: battle.logs[index].actor,
          action: battle.logs[index].action,
          value: battle.logs[index].value
        }
      });
    }

    if (battle.success) {
      await prisma.character.update({
        where: { id: character.id },
        data: { experience: { increment: rewardExp }, spiritStone: { increment: rewardStone }, hp: battle.remainingHp }
      });

      const drops = lootPool(dungeon.monster.code);
      const lootCode = drops[randomInt(0, drops.length - 1)];
      const item = await itemByCode(prisma, lootCode);
      if (item) {
        const quantity = randomInt(1, 2);
        await changeInventory(prisma, character.id, item.id, quantity);
        await prisma.lootRecord.create({
          data: { characterId: character.id, dungeonRunId: run.id, itemDefId: item.id, quantity, spiritStone: rewardStone }
        });
      }

      await advanceQuest(prisma, character.id, "quest_enter_first_dungeon");
    } else {
      await prisma.character.update({ where: { id: character.id }, data: { hp: 1 } });
    }

    const finishedRun = await prisma.dungeonRun.update({
      where: { id: run.id },
      data: { endedAt: new Date(), success: battle.success, turns: battle.turns, rewardExp, rewardStone }
    });

    const current = await prisma.character.findUniqueOrThrow({ where: { id: character.id } });
    const progressed = await applyRealmProgress(current.id, current.experience);
    await syncAchievements(prisma, current.id);

    return { run: finishedRun, result: { success: battle.success, turns: battle.turns, rewardExp, rewardStone }, logs: battle.logs, character: progressed?.character ?? current };
  });

  app.post("/api/shop/purchase", async (request, reply) => {
    const authorized = await requireAuth(request, reply);
    if (!authorized) return;
    const prisma = useDb(reply);
    if (!prisma) return;

    const parsed = purchaseSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Bad request" });

    const [character, shopItem] = await Promise.all([
      ownedCharacter(prisma, request.user.id, parsed.data.characterId),
      prisma.shopItem.findUnique({ where: { id: parsed.data.shopItemId }, include: { itemDef: true } })
    ]);

    if (!character) return reply.code(404).send({ message: "Character not found" });
    if (!shopItem) return reply.code(404).send({ message: "Shop item not found" });
    if (shopItem.stock !== null && shopItem.stock < parsed.data.quantity) return reply.code(400).send({ message: "Stock is not enough" });

    const totalPrice = shopItem.price * parsed.data.quantity;
    if (character.spiritStone < totalPrice) return reply.code(400).send({ message: "Not enough spirit stones" });

    await prisma.character.update({ where: { id: character.id }, data: { spiritStone: { decrement: totalPrice } } });
    if (shopItem.stock !== null) await prisma.shopItem.update({ where: { id: shopItem.id }, data: { stock: { decrement: parsed.data.quantity } } });

    await awardItem(prisma, character.id, shopItem.itemDef, parsed.data.quantity);
    await prisma.purchaseRecord.create({ data: { characterId: character.id, shopItemId: shopItem.id, quantity: parsed.data.quantity, totalPrice } });
    await advanceQuest(prisma, character.id, "quest_buy_first_item", parsed.data.quantity);

    return { message: "Purchase complete", totalPrice };
  });

  app.post("/api/alchemy/batches", async (request, reply) => {
    const authorized = await requireAuth(request, reply);
    if (!authorized) return;
    const prisma = useDb(reply);
    if (!prisma) return;

    const parsed = alchemyBatchSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Bad request" });

    const [character, recipe] = await Promise.all([
      ownedCharacter(prisma, request.user.id, parsed.data.characterId),
      prisma.alchemyRecipe.findUnique({ where: { code: parsed.data.recipeCode }, include: { ingredients: { include: { itemDef: true } } } })
    ]);

    if (!character) return reply.code(404).send({ message: "Character not found" });
    if (!recipe) return reply.code(404).send({ message: "Recipe not found" });
    if (character.qi < recipe.qiCost) return reply.code(400).send({ message: "Not enough qi" });

    for (const ingredient of recipe.ingredients) {
      const slot = await prisma.inventorySlot.findUnique({
        where: { characterId_itemDefId: { characterId: character.id, itemDefId: ingredient.itemDefId } }
      });
      if (!slot || slot.quantity < ingredient.quantity) return reply.code(400).send({ message: `Missing ingredient: ${ingredient.itemDef.name}` });
    }

    for (const ingredient of recipe.ingredients) await changeInventory(prisma, character.id, ingredient.itemDefId, -ingredient.quantity);
    await prisma.character.update({ where: { id: character.id }, data: { qi: { decrement: recipe.qiCost } } });

    const successRate = Math.min(98, recipe.successRate + Math.floor(character.comprehension / 5));
    const success = Math.random() * 100 < successRate;
    const quality = success && successRate > 90 ? 2 : 1;

    const batch = await prisma.alchemyBatch.create({
      data: { characterId: character.id, recipeId: recipe.id, status: success ? "SUCCESS" : "FAILED", quality, finishedAt: new Date() }
    });

    if (success) {
      const item = await itemByName(prisma, recipe.resultName);
      await awardItem(prisma, character.id, item, recipe.resultQty, quality);
      await advanceQuest(prisma, character.id, "quest_brew_first_pill");
    }

    await syncAchievements(prisma, character.id);
    return { message: success ? "Alchemy success" : "Alchemy failed", success, quality, batchId: batch.id };
  });

  app.get("/api/herbalism/plots/:characterId", async (request, reply) => {
    const authorized = await requireAuth(request, reply);
    if (!authorized) return;
    const prisma = useDb(reply);
    if (!prisma) return;

    const params = z.object({ characterId: z.string().min(1) }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: "Bad params" });

    const character = await ownedCharacter(prisma, request.user.id, params.data.characterId);
    if (!character) return reply.code(404).send({ message: "Character not found" });

    return prisma.herbPlot.findMany({
      where: { characterId: character.id },
      include: { cropDef: true },
      orderBy: { slotIndex: "asc" }
    });
  });

  app.post("/api/herbalism/plant", async (request, reply) => {
    const authorized = await requireAuth(request, reply);
    if (!authorized) return;
    const prisma = useDb(reply);
    if (!prisma) return;

    const parsed = plantSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Bad request" });

    const [character, plot, crop] = await Promise.all([
      ownedCharacter(prisma, request.user.id, parsed.data.characterId),
      prisma.herbPlot.findUnique({ where: { id: parsed.data.plotId } }),
      prisma.cropDef.findUnique({ where: { code: parsed.data.cropCode } })
    ]);

    if (!character || !plot || plot.characterId !== parsed.data.characterId) return reply.code(404).send({ message: "Plot not found" });
    if (!crop) return reply.code(404).send({ message: "Crop not found" });
    if (!plot.isUnlocked) return reply.code(400).send({ message: "Plot is locked" });
    if (plot.cropDefId) return reply.code(400).send({ message: "Plot is occupied" });
    if (character.level < crop.requiredRealm) return reply.code(400).send({ message: "Realm is too low" });

    const plantedAt = new Date();
    const matureAt = new Date(plantedAt.getTime() + crop.growthMinutes * 60 * 1000);

    await prisma.herbPlot.update({ where: { id: plot.id }, data: { cropDefId: crop.id, plantedAt, matureAt } });
    await prisma.cropCycle.create({ data: { characterId: character.id, cropDefId: crop.id, plantedAt } });

    return { message: "Plant complete", matureAt };
  });

  app.post("/api/herbalism/harvest", async (request, reply) => {
    const authorized = await requireAuth(request, reply);
    if (!authorized) return;
    const prisma = useDb(reply);
    if (!prisma) return;

    const parsed = harvestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Bad request" });

    const [character, plot] = await Promise.all([
      ownedCharacter(prisma, request.user.id, parsed.data.characterId),
      prisma.herbPlot.findUnique({ where: { id: parsed.data.plotId }, include: { cropDef: true } })
    ]);

    if (!character || !plot || plot.characterId !== parsed.data.characterId || !plot.cropDef) {
      return reply.code(404).send({ message: "Harvest target not found" });
    }

    if (!plot.matureAt || plot.matureAt > new Date()) return reply.code(400).send({ message: "Crop is not mature" });

    const quantity = randomInt(plot.cropDef.yieldMin, plot.cropDef.yieldMax);
    const item = await itemByName(prisma, plot.cropDef.name);
    await awardItem(prisma, character.id, item, quantity);

    const cycle = await prisma.cropCycle.findFirst({
      where: { characterId: character.id, cropDefId: plot.cropDef.id, harvestedAt: null },
      orderBy: { plantedAt: "desc" }
    });

    if (cycle) {
      await prisma.cropCycle.update({
        where: { id: cycle.id },
        data: { harvestedAt: new Date(), yield: quantity }
      });
    }

    await prisma.herbPlot.update({
      where: { id: plot.id },
      data: { cropDefId: null, plantedAt: null, matureAt: null }
    });

    await advanceQuest(prisma, character.id, "quest_harvest_first_herb");
    return { message: "Harvest complete", quantity, itemName: plot.cropDef.name };
  });

  app.post("/api/forge/batches", async (request, reply) => {
    const authorized = await requireAuth(request, reply);
    if (!authorized) return;
    const prisma = useDb(reply);
    if (!prisma) return;

    const parsed = forgeBatchSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Bad request" });

    const [character, recipe] = await Promise.all([
      ownedCharacter(prisma, request.user.id, parsed.data.characterId),
      prisma.forgeRecipe.findUnique({ where: { code: parsed.data.recipeCode }, include: { materials: { include: { itemDef: true } } } })
    ]);

    if (!character) return reply.code(404).send({ message: "Character not found" });
    if (!recipe) return reply.code(404).send({ message: "Forge recipe not found" });
    if (character.qi < recipe.qiCost) return reply.code(400).send({ message: "Not enough qi" });

    for (const material of recipe.materials) {
      const slot = await prisma.inventorySlot.findUnique({
        where: { characterId_itemDefId: { characterId: character.id, itemDefId: material.itemDefId } }
      });
      if (!slot || slot.quantity < material.quantity) return reply.code(400).send({ message: `Missing material: ${material.itemDef.name}` });
    }

    for (const material of recipe.materials) await changeInventory(prisma, character.id, material.itemDefId, -material.quantity);
    await prisma.character.update({ where: { id: character.id }, data: { qi: { decrement: recipe.qiCost } } });

    const successRate = Math.min(95, recipe.successRate + Math.floor(character.rootBone / 4));
    const success = Math.random() * 100 < successRate;
    const quality = success && successRate > 85 ? 2 : 1;

    const batch = await prisma.forgeBatch.create({
      data: { characterId: character.id, recipeId: recipe.id, status: success ? "SUCCESS" : "FAILED", quality, finishedAt: new Date() }
    });

    if (success) {
      const item = await itemByName(prisma, recipe.resultName);
      await awardItem(prisma, character.id, item, 1, quality, recipe.slot);
      await advanceQuest(prisma, character.id, "quest_forge_first_item");
    }

    return { message: success ? "Forge success" : "Forge failed", success, quality, batchId: batch.id };
  });

  app.get("/api/progression/:characterId", async (request, reply) => {
    const authorized = await requireAuth(request, reply);
    if (!authorized) return;
    const prisma = useDb(reply);
    if (!prisma) return;

    const params = z.object({ characterId: z.string().min(1) }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: "Bad params" });

    const character = await ownedCharacter(prisma, request.user.id, params.data.characterId);
    if (!character) return reply.code(404).send({ message: "Character not found" });

    await ensureCharacterProgression(prisma, character.id);
    await syncAchievements(prisma, character.id);

    const [quests, achievements] = await Promise.all([
      prisma.characterQuest.findMany({ where: { characterId: character.id }, include: { questDef: true }, orderBy: { createdAt: "asc" } }),
      prisma.characterAchievement.findMany({ where: { characterId: character.id }, include: { achievementDef: true }, orderBy: { createdAt: "asc" } })
    ]);

    return {
      quests,
      achievements,
      titles: deriveTitles(
        character.level,
        achievements.filter((entry) => entry.claimedAt).length,
        quests.filter((entry) => entry.status === "CLAIMED").length
      )
    };
  });

  app.post("/api/quests/:code/claim", async (request, reply) => {
    const authorized = await requireAuth(request, reply);
    if (!authorized) return;
    const prisma = useDb(reply);
    if (!prisma) return;

    const params = z.object({ code: z.string().min(1) }).safeParse(request.params);
    const body = rewardClaimSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ message: "Bad request" });

    const character = await ownedCharacter(prisma, request.user.id, body.data.characterId);
    if (!character) return reply.code(404).send({ message: "Character not found" });

    await ensureCharacterProgression(prisma, character.id);

    const questDef = await prisma.questDef.findUnique({ where: { code: params.data.code } });
    if (!questDef) return reply.code(404).send({ message: "Quest not found" });

    const quest = await prisma.characterQuest.findUnique({
      where: { characterId_questDefId: { characterId: character.id, questDefId: questDef.id } }
    });

    if (!quest || quest.status !== "COMPLETED") return reply.code(400).send({ message: "Quest is not claimable" });

    await prisma.characterQuest.update({ where: { id: quest.id }, data: { status: "CLAIMED" } });
    await prisma.character.update({
      where: { id: character.id },
      data: { spiritStone: { increment: questDef.rewardStone }, experience: { increment: questDef.rewardExp } }
    });

    const updated = await prisma.character.findUniqueOrThrow({ where: { id: character.id } });
    await applyRealmProgress(updated.id, updated.experience);
    await syncAchievements(prisma, updated.id);

    return { message: "Quest reward claimed", rewardStone: questDef.rewardStone, rewardExp: questDef.rewardExp };
  });

  app.post("/api/achievements/:code/claim", async (request, reply) => {
    const authorized = await requireAuth(request, reply);
    if (!authorized) return;
    const prisma = useDb(reply);
    if (!prisma) return;

    const params = z.object({ code: z.string().min(1) }).safeParse(request.params);
    const body = rewardClaimSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ message: "Bad request" });

    const character = await ownedCharacter(prisma, request.user.id, body.data.characterId);
    if (!character) return reply.code(404).send({ message: "Character not found" });

    await ensureCharacterProgression(prisma, character.id);
    await syncAchievements(prisma, character.id);

    const achievementDef = await prisma.achievementDef.findUnique({ where: { code: params.data.code } });
    if (!achievementDef) return reply.code(404).send({ message: "Achievement not found" });

    const achievement = await prisma.characterAchievement.findUnique({
      where: { characterId_achievementDefId: { characterId: character.id, achievementDefId: achievementDef.id } }
    });

    if (!achievement || !achievement.unlockedAt || achievement.claimedAt) return reply.code(400).send({ message: "Achievement is not claimable" });

    await prisma.characterAchievement.update({ where: { id: achievement.id }, data: { claimedAt: new Date() } });
    await prisma.character.update({ where: { id: character.id }, data: { spiritStone: { increment: achievementDef.rewardStone } } });

    return { message: "Achievement reward claimed", rewardStone: achievementDef.rewardStone };
  });

  app.get("/api/titles/:characterId", async (request, reply) => {
    const authorized = await requireAuth(request, reply);
    if (!authorized) return;
    const prisma = useDb(reply);
    if (!prisma) return;

    const params = z.object({ characterId: z.string().min(1) }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ message: "Bad params" });

    const character = await ownedCharacter(prisma, request.user.id, params.data.characterId);
    if (!character) return reply.code(404).send({ message: "Character not found" });

    await ensureCharacterProgression(prisma, character.id);
    await syncAchievements(prisma, character.id);

    const [quests, achievements] = await Promise.all([
      prisma.characterQuest.count({ where: { characterId: character.id, status: "CLAIMED" } }),
      prisma.characterAchievement.count({ where: { characterId: character.id, claimedAt: { not: null } } })
    ]);

    return { titles: deriveTitles(character.level, achievements, quests) };
  });
}
