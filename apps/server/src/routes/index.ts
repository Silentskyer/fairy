import type { FastifyInstance } from "fastify";
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

const registerSchema = z.object({
  email: z.string().email("請輸入正確的電子信箱"),
  password: z.string().min(6, "密碼至少需要 6 碼")
});

const createCharacterSchema = z.object({
  name: z
    .string()
    .min(2, "角色名稱至少 2 個字")
    .max(12, "角色名稱最多 12 個字"),
  rootBone: z.number().int().min(8).max(20).default(12),
  comprehension: z.number().int().min(8).max(20).default(12)
});

const cultivateSchema = z.object({
  mode: z.enum(["MANUAL_STONE", "MANUAL_GONGFA"]),
  minutes: z.number().int().min(5).max(720).optional(),
  spiritStoneSpend: z.number().int().min(1).max(5000).optional()
});

function withItemNames() {
  return shopSeeds.map((entry) => {
    const item = itemSeeds.find((candidate) => candidate.code === entry.itemCode);

    return {
      ...entry,
      itemName: item?.name ?? entry.itemCode,
      category: item?.category ?? "MATERIAL"
    };
  });
}

function computeCultivationGain(input: z.infer<typeof cultivateSchema>, comprehension: number) {
  if (input.mode === "MANUAL_GONGFA") {
    const minutes = input.minutes ?? 60;
    return Math.max(1, Math.floor(minutes * (1 + comprehension / 100)));
  }

  const spent = input.spiritStoneSpend ?? 10;
  return spent * 4 + Math.floor(comprehension / 2);
}

async function getOverview() {
  const prisma = getPrismaClient();

  if (!prisma) {
    return overviewSnapshot;
  }

  const [realmCount, dungeonCount, shopItemCount, recipeCount, cropCount, forgeRecipeCount] = await Promise.all([
    prisma.realmLevel.count(),
    prisma.dungeonDef.count(),
    prisma.shopItem.count(),
    prisma.alchemyRecipe.count(),
    prisma.cropDef.count(),
    prisma.forgeRecipe.count()
  ]);

  return {
    ...overviewSnapshot,
    realmCount,
    dungeonCount,
    shopItemCount,
    recipeCount,
    cropCount,
    forgeRecipeCount
  };
}

async function applyRealmProgress(characterId: string, startingExp: number) {
  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  let currentCharacter = await prisma.character.findUniqueOrThrow({
    where: { id: characterId },
    include: {
      realmLevel: true
    }
  });

  let currentExp = startingExp;
  let promoted = false;

  while (true) {
    const nextRealm = await prisma.realmLevel.findFirst({
      where: {
        order: currentCharacter.realmLevel.order + 1
      }
    });

    if (!nextRealm || currentExp < nextRealm.requiredExp) {
      break;
    }

    promoted = true;

    currentCharacter = await prisma.character.update({
      where: { id: characterId },
      data: {
        realmLevelId: nextRealm.id,
        level: nextRealm.order,
        maxHp: {
          increment: 12
        },
        hp: {
          increment: 12
        },
        maxQi: {
          increment: 8
        },
        qi: {
          increment: 8
        },
        attack: {
          increment: 3
        },
        defense: {
          increment: 2
        },
        agility: {
          increment: 2
        }
      },
      include: {
        realmLevel: true
      }
    });
  }

  return {
    character: currentCharacter,
    promoted
  };
}

export async function registerRoutes(app: FastifyInstance) {
  app.get("/api", async () => {
    return {
      name: "Fairy Cultivation API",
      modules: gameModules,
      mode: process.env.DATABASE_URL ? "database" : "seed"
    };
  });

  app.get("/api/overview", async () => {
    return getOverview();
  });

  app.get("/api/modules", async () => {
    return gameModules;
  });

  app.get("/api/realms", async () => {
    const prisma = getPrismaClient();

    if (!prisma) {
      return realmSeeds;
    }

    return prisma.realmLevel.findMany({
      orderBy: {
        order: "asc"
      }
    });
  });

  app.get("/api/dungeons", async () => {
    const prisma = getPrismaClient();

    if (!prisma) {
      return dungeonSeeds;
    }

    return prisma.dungeonDef.findMany({
      include: {
        monster: true
      },
      orderBy: {
        minRealmOrder: "asc"
      }
    });
  });

  app.get("/api/shop-items", async () => {
    const prisma = getPrismaClient();

    if (!prisma) {
      return withItemNames();
    }

    const shopItems = await prisma.shopItem.findMany({
      include: {
        itemDef: true
      },
      orderBy: {
        price: "asc"
      }
    });

    return shopItems.map((entry) => ({
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

    if (!prisma) {
      return alchemyRecipeSeeds;
    }

    return prisma.alchemyRecipe.findMany({
      include: {
        ingredients: {
          include: {
            itemDef: true
          }
        }
      },
      orderBy: {
        successRate: "desc"
      }
    });
  });

  app.get("/api/crops", async () => {
    const prisma = getPrismaClient();

    if (!prisma) {
      return cropSeeds;
    }

    return prisma.cropDef.findMany({
      orderBy: {
        requiredRealm: "asc"
      }
    });
  });

  app.get("/api/forge/recipes", async () => {
    const prisma = getPrismaClient();

    if (!prisma) {
      return forgeRecipeSeeds;
    }

    return prisma.forgeRecipe.findMany({
      include: {
        materials: {
          include: {
            itemDef: true
          }
        }
      }
    });
  });

  app.post("/api/auth/register", async (request, reply) => {
    const prisma = getPrismaClient();

    if (!prisma) {
      return reply.code(503).send({
        message: "目前尚未連接資料庫，請先設定 Supabase DATABASE_URL"
      });
    }

    const parsed = registerSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        message: parsed.error.issues[0]?.message ?? "註冊資料格式錯誤"
      });
    }

    const existing = await prisma.user.findUnique({
      where: {
        email: parsed.data.email
      }
    });

    if (existing) {
      return reply.code(409).send({
        message: "此電子信箱已被使用"
      });
    }

    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash: hashPassword(parsed.data.password)
      }
    });

    const token = await reply.jwtSign({
      id: user.id,
      email: user.email
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email
      }
    };
  });

  app.post("/api/auth/login", async (request, reply) => {
    const prisma = getPrismaClient();

    if (!prisma) {
      return reply.code(503).send({
        message: "目前尚未連接資料庫，請先設定 Supabase DATABASE_URL"
      });
    }

    const parsed = registerSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        message: parsed.error.issues[0]?.message ?? "登入資料格式錯誤"
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email: parsed.data.email
      }
    });

    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return reply.code(401).send({
        message: "帳號或密碼錯誤"
      });
    }

    const token = await reply.jwtSign({
      id: user.id,
      email: user.email
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email
      }
    };
  });

  app.get("/api/me", async (request, reply) => {
    const authorized = await requireAuth(request, reply);

    if (!authorized) {
      return;
    }

    return {
      user: request.user
    };
  });

  app.get("/api/characters", async (request, reply) => {
    const authorized = await requireAuth(request, reply);

    if (!authorized) {
      return;
    }

    const prisma = getPrismaClient();

    if (!prisma) {
      return reply.code(503).send({
        message: "目前尚未連接資料庫，請先設定 Supabase DATABASE_URL"
      });
    }

    const characters = await prisma.character.findMany({
      where: {
        userId: request.user.id
      },
      include: {
        realmLevel: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return characters;
  });

  app.get("/api/characters/:id", async (request, reply) => {
    const authorized = await requireAuth(request, reply);

    if (!authorized) {
      return;
    }

    const prisma = getPrismaClient();

    if (!prisma) {
      return reply.code(503).send({
        message: "目前尚未連接資料庫，請先設定 Supabase DATABASE_URL"
      });
    }

    const params = z.object({ id: z.string().min(1) }).parse(request.params);

    const character = await prisma.character.findFirst({
      where: {
        id: params.id,
        userId: request.user.id
      },
      include: {
        realmLevel: true,
        inventorySlots: {
          include: {
            itemDef: true
          }
        },
        herbPlots: true
      }
    });

    if (!character) {
      return reply.code(404).send({
        message: "找不到角色"
      });
    }

    return character;
  });

  app.post("/api/characters", async (request, reply) => {
    const authorized = await requireAuth(request, reply);

    if (!authorized) {
      return;
    }

    const prisma = getPrismaClient();

    if (!prisma) {
      return reply.code(503).send({
        message: "目前尚未連接資料庫，請先設定 Supabase DATABASE_URL"
      });
    }

    const parsed = createCharacterSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        message: parsed.error.issues[0]?.message ?? "角色資料格式錯誤"
      });
    }

    const existing = await prisma.character.findUnique({
      where: {
        name: parsed.data.name
      }
    });

    if (existing) {
      return reply.code(409).send({
        message: "角色名稱已被使用"
      });
    }

    const firstRealm = await prisma.realmLevel.findFirst({
      orderBy: {
        order: "asc"
      }
    });

    if (!firstRealm) {
      return reply.code(500).send({
        message: "資料庫尚未建立境界資料，請先執行 seed"
      });
    }

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
      include: {
        realmLevel: true,
        herbPlots: true
      }
    });

    const starterItems = ["qi_powder", "blood_powder", "field_seed_qi_grass"];

    for (const code of starterItems) {
      const item = await prisma.itemDef.findUnique({
        where: {
          code
        }
      });

      if (item) {
        await prisma.inventorySlot.create({
          data: {
            characterId: created.id,
            itemDefId: item.id,
            quantity: code === "field_seed_qi_grass" ? 3 : 2
          }
        });
      }
    }

    return reply.code(201).send(created);
  });

  app.post("/api/characters/:id/cultivate", async (request, reply) => {
    const authorized = await requireAuth(request, reply);

    if (!authorized) {
      return;
    }

    const prisma = getPrismaClient();

    if (!prisma) {
      return reply.code(503).send({
        message: "目前尚未連接資料庫，請先設定 Supabase DATABASE_URL"
      });
    }

    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const parsed = cultivateSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        message: parsed.error.issues[0]?.message ?? "修練參數格式錯誤"
      });
    }

    const character = await prisma.character.findFirst({
      where: {
        id: params.id,
        userId: request.user.id
      },
      include: {
        realmLevel: true
      }
    });

    if (!character) {
      return reply.code(404).send({
        message: "找不到角色"
      });
    }

    if (parsed.data.mode === "MANUAL_STONE") {
      const spend = parsed.data.spiritStoneSpend ?? 10;

      if (character.spiritStone < spend) {
        return reply.code(400).send({
          message: "靈石不足"
        });
      }
    }

    const gain = computeCultivationGain(parsed.data, character.comprehension);

    const updated = await prisma.character.update({
      where: {
        id: character.id
      },
      data: {
        experience: {
          increment: gain
        },
        spiritStone:
          parsed.data.mode === "MANUAL_STONE"
            ? {
                decrement: parsed.data.spiritStoneSpend ?? 10
              }
            : undefined,
        qi:
          parsed.data.mode === "MANUAL_GONGFA"
            ? {
                decrement: Math.min(character.qi, Math.max(5, Math.floor(gain / 8)))
              }
            : undefined
      },
      include: {
        realmLevel: true
      }
    });

    const progressed = await applyRealmProgress(updated.id, updated.experience);

    return {
      message: parsed.data.mode === "MANUAL_STONE" ? "已完成靈石灌注修練" : "已完成功法掛機修練",
      gain,
      promoted: progressed?.promoted ?? false,
      character: progressed?.character ?? updated
    };
  });
}
