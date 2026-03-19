export type GameModule = {
  key: string;
  name: string;
  description: string;
};

export const gameModules: GameModule[] = [
  {
    key: "cultivation",
    name: "修練升級",
    description: "累積修為、提升境界、進行突破。"
  },
  {
    key: "dungeons",
    name: "打怪副本",
    description: "挑戰副本、戰勝妖獸並獲取掉落獎勵。"
  },
  {
    key: "shop",
    name: "商店購買",
    description: "使用靈石購買材料、丹藥與裝備。"
  },
  {
    key: "alchemy",
    name: "煉丹",
    description: "消耗丹方與藥材煉製不同品質的丹藥。"
  },
  {
    key: "herbalism",
    name: "種藥",
    description: "在藥田中栽培靈草，等待成熟後收成。"
  },
  {
    key: "forging",
    name: "鍛造",
    description: "以礦石與圖譜打造武器、防具與法寶。"
  }
];
