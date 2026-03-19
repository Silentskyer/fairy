import type { FastifyInstance } from "fastify";
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
import { getPrismaClient } from "../lib/prisma.js";

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

    const realms = await prisma.realmLevel.findMany({
      orderBy: {
        order: "asc"
      }
    });

    return realms;
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
}
