import { useQuery } from "@tanstack/react-query";
import type { DungeonSeed, GameModule, OverviewSnapshot } from "@fairy/shared";

type ShopCard = {
  itemCode: string;
  itemName: string;
  category: string;
  price: number;
  stock: number | null;
  refreshHour: number | null;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "/api";

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }

  return response.json() as Promise<T>;
}

export function App() {
  const overviewQuery = useQuery({
    queryKey: ["overview"],
    queryFn: () => fetchJson<OverviewSnapshot>("/overview")
  });

  const modulesQuery = useQuery({
    queryKey: ["modules"],
    queryFn: () => fetchJson<GameModule[]>("/modules")
  });

  const dungeonsQuery = useQuery({
    queryKey: ["dungeons"],
    queryFn: () => fetchJson<DungeonSeed[]>("/dungeons")
  });

  const shopQuery = useQuery({
    queryKey: ["shop-items"],
    queryFn: () => fetchJson<ShopCard[]>("/shop-items")
  });

  const loading =
    overviewQuery.isLoading || modulesQuery.isLoading || dungeonsQuery.isLoading || shopQuery.isLoading;
  const error = overviewQuery.error || modulesQuery.error || dungeonsQuery.error || shopQuery.error;

  if (loading) {
    return (
      <main className="page-shell">
        <section className="hero-card">
          <p className="eyebrow">載入中</p>
          <h1>Fairy Cultivation</h1>
          <p className="lead">正在整理世界觀、系統模組與初版內容資料...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-shell">
        <section className="hero-card">
          <p className="eyebrow">讀取失敗</p>
          <h1>Fairy Cultivation</h1>
          <p className="lead">
            前端已經切到 API 模式，但目前沒有成功拿到資料。請先確認 `VITE_API_BASE_URL` 或 Vercel API
            路由設定。
          </p>
        </section>
      </main>
    );
  }

  const overview = overviewQuery.data ?? null;
  const modules = modulesQuery.data ?? [];
  const dungeons = dungeonsQuery.data ?? [];
  const shopItems = shopQuery.data ?? [];

  return (
    <main className="page-shell">
      <section className="hero-card hero-grid">
        <div>
          <p className="eyebrow">凡人流文字修仙</p>
          <h1>Fairy Cultivation</h1>
          <p className="lead">
            {overview?.setting ??
              "靈氣衰退的修真亂世中，你將以散修身分在修練、副本、生產與交易之間求生。"}
          </p>
        </div>

        <div className="stat-grid">
          <article className="stat-card">
            <span>境界節點</span>
            <strong>{overview?.realmCount ?? 0}</strong>
          </article>
          <article className="stat-card">
            <span>副本數量</span>
            <strong>{overview?.dungeonCount ?? 0}</strong>
          </article>
          <article className="stat-card">
            <span>商店商品</span>
            <strong>{overview?.shopItemCount ?? 0}</strong>
          </article>
          <article className="stat-card">
            <span>生產配方</span>
            <strong>{(overview?.recipeCount ?? 0) + (overview?.forgeRecipeCount ?? 0)}</strong>
          </article>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <p className="eyebrow">核心玩法</p>
          <h2>六大模組已接到資料層</h2>
        </div>
        <div className="grid">
          {modules.map((module) => (
            <article key={module.key} className="module-card">
              <h3>{module.name}</h3>
              <p>{module.description}</p>
              <span className="status-tag">已建立初版資料</span>
            </article>
          ))}
        </div>
      </section>

      <section className="two-column">
        <article className="panel-card">
          <div className="section-heading">
            <p className="eyebrow">副本階梯</p>
            <h2>前期可玩的初版地圖</h2>
          </div>
          <div className="stack-list">
            {dungeons.slice(0, 4).map((dungeon) => (
              <div key={dungeon.code} className="list-card">
                <div className="list-row">
                  <h3>{dungeon.name}</h3>
                  <span>{dungeon.recommendedRealm ?? `最低序位 ${dungeon.minRealmOrder}`}</span>
                </div>
                <p>{dungeon.description}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <div className="section-heading">
            <p className="eyebrow">坊市物資</p>
            <h2>商店首批上架資源</h2>
          </div>
          <div className="stack-list">
            {shopItems.slice(0, 6).map((item) => (
              <div key={item.itemCode} className="list-card compact">
                <div className="list-row">
                  <h3>{item.itemName}</h3>
                  <span>{item.price} 靈石</span>
                </div>
                <p>
                  {item.category}
                  {item.stock ? ` / 限購 ${item.stock}` : " / 常駐供應"}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
