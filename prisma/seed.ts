import { PrismaClient } from "@prisma/client";
import {
  alchemyRecipeSeeds,
  cropSeeds,
  dungeonSeeds,
  forgeRecipeSeeds,
  itemSeeds,
  monsterSeeds,
  realmSeeds,
  shopSeeds
} from "../packages/shared/src/index.js";

const prisma = new PrismaClient();

async function seedRealms() {
  for (const realm of realmSeeds) {
    await prisma.realmLevel.upsert({
      where: { name: realm.name },
      update: {
        order: realm.order,
        requiredExp: realm.requiredExp,
        breakthroughHp: realm.breakthroughHp,
        breakthroughQi: realm.breakthroughQi
      },
      create: {
        name: realm.name,
        order: realm.order,
        requiredExp: realm.requiredExp,
        breakthroughHp: realm.breakthroughHp,
        breakthroughQi: realm.breakthroughQi
      }
    });
  }
}

async function seedItems() {
  for (const item of itemSeeds) {
    await prisma.itemDef.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        category: item.category,
        rarity: item.rarity,
        stackable: item.stackable,
        baseValue: item.baseValue,
        description: item.description
      },
      create: item
    });
  }
}

async function seedMonsters() {
  for (const monster of monsterSeeds) {
    await prisma.monsterDef.upsert({
      where: { code: monster.code },
      update: {
        name: monster.name,
        level: monster.level,
        hp: monster.hp,
        attack: monster.attack,
        defense: monster.defense,
        speed: monster.speed,
        rewardExp: monster.rewardExp,
        rewardStone: monster.rewardStone
      },
      create: {
        code: monster.code,
        name: monster.name,
        level: monster.level,
        hp: monster.hp,
        attack: monster.attack,
        defense: monster.defense,
        speed: monster.speed,
        rewardExp: monster.rewardExp,
        rewardStone: monster.rewardStone
      }
    });
  }
}

async function seedDungeons() {
  for (const dungeon of dungeonSeeds) {
    const monster = await prisma.monsterDef.findUniqueOrThrow({
      where: { code: dungeon.monsterCode }
    });

    await prisma.dungeonDef.upsert({
      where: { code: dungeon.code },
      update: {
        name: dungeon.name,
        description: dungeon.description,
        staminaCost: dungeon.staminaCost,
        minRealmOrder: dungeon.minRealmOrder,
        rewardStone: dungeon.rewardStone,
        monsterId: monster.id
      },
      create: {
        code: dungeon.code,
        name: dungeon.name,
        description: dungeon.description,
        staminaCost: dungeon.staminaCost,
        minRealmOrder: dungeon.minRealmOrder,
        rewardStone: dungeon.rewardStone,
        monsterId: monster.id
      }
    });
  }
}

async function seedShopItems() {
  for (const entry of shopSeeds) {
    const item = await prisma.itemDef.findUniqueOrThrow({
      where: { code: entry.itemCode }
    });

    await prisma.shopItem.upsert({
      where: {
        id: `${item.code}-shop`
      },
      update: {
        itemDefId: item.id,
        price: entry.price,
        stock: entry.stock,
        refreshHour: entry.refreshHour
      },
      create: {
        id: `${item.code}-shop`,
        itemDefId: item.id,
        price: entry.price,
        stock: entry.stock,
        refreshHour: entry.refreshHour
      }
    });
  }
}

async function seedAlchemyRecipes() {
  for (const recipe of alchemyRecipeSeeds) {
    const savedRecipe = await prisma.alchemyRecipe.upsert({
      where: { code: recipe.code },
      update: {
        name: recipe.name,
        resultName: recipe.resultName,
        resultQty: recipe.resultQty,
        qiCost: recipe.qiCost,
        successRate: recipe.successRate
      },
      create: {
        code: recipe.code,
        name: recipe.name,
        resultName: recipe.resultName,
        resultQty: recipe.resultQty,
        qiCost: recipe.qiCost,
        successRate: recipe.successRate
      }
    });

    for (const ingredient of recipe.ingredients) {
      const item = await prisma.itemDef.findUniqueOrThrow({
        where: { code: ingredient.itemCode }
      });

      await prisma.alchemyRecipeIngredient.upsert({
        where: {
          recipeId_itemDefId: {
            recipeId: savedRecipe.id,
            itemDefId: item.id
          }
        },
        update: {
          quantity: ingredient.quantity
        },
        create: {
          recipeId: savedRecipe.id,
          itemDefId: item.id,
          quantity: ingredient.quantity
        }
      });
    }
  }
}

async function seedCrops() {
  for (const crop of cropSeeds) {
    await prisma.cropDef.upsert({
      where: { code: crop.code },
      update: {
        name: crop.name,
        growthMinutes: crop.growthMinutes,
        yieldMin: crop.yieldMin,
        yieldMax: crop.yieldMax,
        requiredRealm: crop.requiredRealm
      },
      create: crop
    });
  }
}

async function seedForgeRecipes() {
  for (const recipe of forgeRecipeSeeds) {
    const savedRecipe = await prisma.forgeRecipe.upsert({
      where: { code: recipe.code },
      update: {
        name: recipe.name,
        resultName: recipe.resultName,
        slot: recipe.slot,
        qiCost: recipe.qiCost,
        successRate: recipe.successRate
      },
      create: {
        code: recipe.code,
        name: recipe.name,
        resultName: recipe.resultName,
        slot: recipe.slot,
        qiCost: recipe.qiCost,
        successRate: recipe.successRate
      }
    });

    for (const material of recipe.materials) {
      const item = await prisma.itemDef.findUniqueOrThrow({
        where: { code: material.itemCode }
      });

      await prisma.forgeRecipeMaterial.upsert({
        where: {
          recipeId_itemDefId: {
            recipeId: savedRecipe.id,
            itemDefId: item.id
          }
        },
        update: {
          quantity: material.quantity
        },
        create: {
          recipeId: savedRecipe.id,
          itemDefId: item.id,
          quantity: material.quantity
        }
      });
    }
  }
}

async function seedDemoUser() {
  const firstRealm = await prisma.realmLevel.findFirstOrThrow({
    orderBy: {
      order: "asc"
    }
  });

  const user = await prisma.user.upsert({
    where: { email: "demo@fairy.local" },
    update: {
      passwordHash: "demo-password-hash"
    },
    create: {
      email: "demo@fairy.local",
      passwordHash: "demo-password-hash"
    }
  });

  await prisma.character.upsert({
    where: { name: "韓石" },
    update: {
      userId: user.id,
      realmLevelId: firstRealm.id,
      spiritStone: 120,
      hp: 120,
      maxHp: 120,
      qi: 80,
      maxQi: 80,
      attack: 18,
      defense: 12,
      agility: 16,
      comprehension: 14,
      rootBone: 12
    },
    create: {
      userId: user.id,
      name: "韓石",
      realmLevelId: firstRealm.id,
      spiritStone: 120,
      hp: 120,
      maxHp: 120,
      qi: 80,
      maxQi: 80,
      attack: 18,
      defense: 12,
      agility: 16,
      comprehension: 14,
      rootBone: 12
    }
  });
}

async function main() {
  await seedRealms();
  await seedItems();
  await seedMonsters();
  await seedDungeons();
  await seedShopItems();
  await seedAlchemyRecipes();
  await seedCrops();
  await seedForgeRecipes();
  await seedDemoUser();

  console.log("Seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
