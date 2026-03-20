import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./lib/api";

type AuthResponse = {
  token: string;
  user: {
    id: string;
    email: string;
  };
};

type CharacterSummary = {
  id: string;
  name: string;
  level: number;
  experience: number;
  spiritStone: number;
  qi: number;
  hp: number;
  realmLevel?: {
    name: string;
  };
};

type CharacterDetail = CharacterSummary & {
  maxHp: number;
  maxQi: number;
  attack: number;
  defense: number;
  agility: number;
  comprehension: number;
  rootBone: number;
  inventorySlots: Array<{
    id: string;
    quantity: number;
    itemDef: {
      id: string;
      name: string;
      category: string;
    };
  }>;
  herbPlots: Array<{
    id: string;
    slotIndex: number;
    isUnlocked: boolean;
    matureAt: string | null;
    cropDef?: {
      id: string;
      name: string;
    } | null;
  }>;
  equipmentInstances: Array<{
    id: string;
    name: string;
    quality: number;
    slot: string;
  }>;
};

type Dungeon = {
  id: string;
  name: string;
  description: string;
  minRealmOrder: number;
  rewardStone: number;
  monster: {
    name: string;
    rewardExp: number;
  };
};

type ShopItem = {
  shopItemId: string;
  itemCode: string;
  itemName: string;
  category: string;
  price: number;
  stock: number | null;
};

type Recipe = {
  id?: string;
  code: string;
  name: string;
  resultName: string;
  successRate: number;
  ingredients?: Array<{
    quantity: number;
    itemDef?: {
      name: string;
    };
  }>;
};

type Crop = {
  id?: string;
  code: string;
  name: string;
  growthMinutes: number;
  requiredRealm: number;
};

type ForgeRecipe = {
  id?: string;
  code: string;
  name: string;
  resultName: string;
  successRate: number;
  slot: string;
  materials?: Array<{
    quantity: number;
    itemDef?: {
      name: string;
    };
  }>;
};

type Progression = {
  quests: Array<{
    id: string;
    status: string;
    progress: number;
    questDef: {
      code: string;
      name: string;
      description: string;
      rewardStone: number;
      rewardExp: number;
    };
  }>;
  achievements: Array<{
    id: string;
    unlockedAt: string | null;
    claimedAt: string | null;
    achievementDef: {
      code: string;
      name: string;
      description: string;
      rewardStone: number;
    };
  }>;
  titles: string[];
};

type ActivePage =
  | "dashboard"
  | "cultivation"
  | "dungeons"
  | "shop"
  | "alchemy"
  | "herbalism"
  | "forge"
  | "progression";

const tokenKey = "fairy-token";
const characterKey = "fairy-character-id";

const navItems: Array<{ key: ActivePage; label: string }> = [
  { key: "dashboard", label: "角色主介面" },
  { key: "cultivation", label: "修練" },
  { key: "dungeons", label: "副本" },
  { key: "shop", label: "商店" },
  { key: "alchemy", label: "煉丹" },
  { key: "herbalism", label: "種藥" },
  { key: "forge", label: "鍛造" },
  { key: "progression", label: "任務 / 成就" }
];

function readToken() {
  return window.localStorage.getItem(tokenKey);
}

function readCharacterId() {
  return window.localStorage.getItem(characterKey);
}

function saveToken(token: string | null) {
  if (token) {
    window.localStorage.setItem(tokenKey, token);
  } else {
    window.localStorage.removeItem(tokenKey);
  }
}

function saveCharacterId(id: string | null) {
  if (id) {
    window.localStorage.setItem(characterKey, id);
  } else {
    window.localStorage.removeItem(characterKey);
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "未成熟";
  return new Date(value).toLocaleString("zh-TW", { hour12: false });
}

function joinNamedMaterials(
  list: Array<{
    quantity: number;
    itemDef?: {
      name: string;
    };
  }> | undefined
) {
  return (list ?? []).map((entry) => `${entry.itemDef?.name ?? "素材"} x${entry.quantity}`).join("、");
}

function StatCard(props: { label: string; value: string | number; hint?: string }) {
  return (
    <article className="stat-card">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
      {props.hint ? <small>{props.hint}</small> : null}
    </article>
  );
}

function SectionCard(props: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="panel-card">
      <div className="section-heading">
        <p className="eyebrow">{props.subtitle ?? "System"}</p>
        <h2>{props.title}</h2>
      </div>
      {props.children}
    </section>
  );
}

function DashboardPage({ character }: { character: CharacterDetail }) {
  return (
    <div className="page-grid">
      <SectionCard title="角色概覽" subtitle="Character">
        <div className="stat-grid">
          <StatCard label="境界" value={character.realmLevel?.name ?? "-"} />
          <StatCard label="靈石" value={character.spiritStone} />
          <StatCard label="生命" value={`${character.hp} / ${character.maxHp}`} />
          <StatCard label="靈氣" value={`${character.qi} / ${character.maxQi}`} />
          <StatCard label="攻擊" value={character.attack} />
          <StatCard label="身法" value={character.agility} />
        </div>
      </SectionCard>

      <SectionCard title="背包" subtitle="Inventory">
        <div className="stack-list">
          {character.inventorySlots.length ? (
            character.inventorySlots.map((slot) => (
              <div key={slot.id} className="list-card compact">
                <div className="list-row">
                  <h3>{slot.itemDef.name}</h3>
                  <span>x{slot.quantity}</span>
                </div>
                <p>{slot.itemDef.category}</p>
              </div>
            ))
          ) : (
            <p className="muted">目前沒有物品。</p>
          )}
        </div>
      </SectionCard>

      <SectionCard title="裝備" subtitle="Equipment">
        <div className="stack-list">
          {character.equipmentInstances.length ? (
            character.equipmentInstances.map((item) => (
              <div key={item.id} className="list-card compact">
                <div className="list-row">
                  <h3>{item.name}</h3>
                  <span>{item.slot}</span>
                </div>
                <p>品質 {item.quality}</p>
              </div>
            ))
          ) : (
            <p className="muted">目前沒有裝備。</p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function AppShell() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => readToken());
  const [activePage, setActivePage] = useState<ActivePage>("dashboard");
  const [message, setMessage] = useState("準備進入修仙世界。");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(() => readCharacterId());
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [characterForm, setCharacterForm] = useState({ name: "", rootBone: 12, comprehension: 12 });
  const [cultivationForm, setCultivationForm] = useState({ mode: "MANUAL_GONGFA", minutes: 60, spiritStoneSpend: 10 });
  const [purchaseQuantity, setPurchaseQuantity] = useState<Record<string, number>>({});

  useEffect(() => {
    saveToken(token);
  }, [token]);

  useEffect(() => {
    saveCharacterId(selectedCharacterId);
  }, [selectedCharacterId]);

  const charactersQuery = useQuery({
    queryKey: ["characters", token],
    queryFn: () => apiRequest<CharacterSummary[]>("/characters", { token }),
    enabled: Boolean(token)
  });

  useEffect(() => {
    if (!charactersQuery.data?.length) return;
    const hasSelected = charactersQuery.data.some((character) => character.id === selectedCharacterId);
    if (!hasSelected) {
      setSelectedCharacterId(charactersQuery.data[0].id);
    }
  }, [charactersQuery.data, selectedCharacterId]);

  const characterDetailQuery = useQuery({
    queryKey: ["character-detail", token, selectedCharacterId],
    queryFn: () => apiRequest<CharacterDetail>(`/characters/${selectedCharacterId}`, { token }),
    enabled: Boolean(token && selectedCharacterId)
  });

  const dungeonsQuery = useQuery({
    queryKey: ["dungeons-list"],
    queryFn: () => apiRequest<Dungeon[]>("/dungeons", { token }),
    enabled: Boolean(token)
  });

  const shopQuery = useQuery({
    queryKey: ["shop-items"],
    queryFn: () => apiRequest<ShopItem[]>("/shop-items", { token }),
    enabled: Boolean(token)
  });

  const recipesQuery = useQuery({
    queryKey: ["alchemy-recipes"],
    queryFn: () => apiRequest<Recipe[]>("/alchemy/recipes", { token }),
    enabled: Boolean(token)
  });

  const cropsQuery = useQuery({
    queryKey: ["crops"],
    queryFn: () => apiRequest<Crop[]>("/crops", { token }),
    enabled: Boolean(token)
  });

  const forgeQuery = useQuery({
    queryKey: ["forge-recipes"],
    queryFn: () => apiRequest<ForgeRecipe[]>("/forge/recipes", { token }),
    enabled: Boolean(token)
  });

  const progressionQuery = useQuery({
    queryKey: ["progression", token, selectedCharacterId],
    queryFn: () => apiRequest<Progression>(`/progression/${selectedCharacterId}`, { token }),
    enabled: Boolean(token && selectedCharacterId)
  });

  const authMutation = useMutation({
    mutationFn: (payload: typeof authForm) =>
      apiRequest<AuthResponse>(`/auth/${authMode === "login" ? "login" : "register"}`, {
        method: "POST",
        body: payload
      }),
    onSuccess: (data) => {
      setToken(data.token);
      setMessage(authMode === "login" ? "登入成功。" : "註冊成功，已自動登入。");
      setAuthForm({ email: "", password: "" });
    },
    onError: (error: Error) => setMessage(error.message)
  });

  const createCharacterMutation = useMutation({
    mutationFn: () =>
      apiRequest<CharacterSummary>("/characters", {
        method: "POST",
        body: characterForm,
        token
      }),
    onSuccess: async (data) => {
      setSelectedCharacterId(data.id);
      setMessage(`角色 ${data.name} 建立成功。`);
      await queryClient.invalidateQueries({ queryKey: ["characters"] });
    },
    onError: (error: Error) => setMessage(error.message)
  });

  const actionMutation = useMutation({
    mutationFn: async (payload: { path: string; body?: unknown }) =>
      apiRequest<{ message?: string }>(payload.path, {
        method: "POST",
        body: payload.body,
        token
      }),
    onSuccess: async (data) => {
      setMessage(data.message ?? "操作完成。");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["characters"] }),
        queryClient.invalidateQueries({ queryKey: ["character-detail"] }),
        queryClient.invalidateQueries({ queryKey: ["shop-items"] }),
        queryClient.invalidateQueries({ queryKey: ["progression"] })
      ]);
    },
    onError: (error: Error) => setMessage(error.message)
  });

  const logout = () => {
    setToken(null);
    setSelectedCharacterId(null);
    queryClient.clear();
    setMessage("已登出。");
  };

  if (!token) {
    return (
      <main className="page-shell auth-shell">
        <section className="hero-card auth-card">
          <p className="eyebrow">Fairy Cultivation</p>
          <h1>登入 / 註冊</h1>
          <p className="lead">只需要帳號與密碼就能進入遊戲。</p>
          <div className="tab-row">
            <button className={authMode === "login" ? "tab-button active" : "tab-button"} onClick={() => setAuthMode("login")}>
              登入
            </button>
            <button className={authMode === "register" ? "tab-button active" : "tab-button"} onClick={() => setAuthMode("register")}>
              註冊
            </button>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>帳號</span>
              <input value={authForm.email} onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))} />
            </label>
            <label className="field">
              <span>密碼</span>
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
              />
            </label>
          </div>
          <button className="primary-button" onClick={() => authMutation.mutate(authForm)}>
            {authMode === "login" ? "登入" : "註冊"}
          </button>
          <p className="message-box">{message}</p>
        </section>
      </main>
    );
  }

  if (charactersQuery.isLoading) {
    return <main className="page-shell"><section className="hero-card"><p className="lead">載入角色資料中...</p></section></main>;
  }

  if (!charactersQuery.data?.length) {
    return (
      <main className="page-shell auth-shell">
        <section className="hero-card auth-card">
          <p className="eyebrow">Create Character</p>
          <h1>建立角色</h1>
          <p className="lead">先建立你的散修角色，之後才能進入各玩法頁面。</p>
          <div className="form-grid">
            <label className="field">
              <span>名稱</span>
              <input value={characterForm.name} onChange={(event) => setCharacterForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="field">
              <span>根骨</span>
              <input
                type="number"
                value={characterForm.rootBone}
                onChange={(event) => setCharacterForm((current) => ({ ...current, rootBone: Number(event.target.value) }))}
              />
            </label>
            <label className="field">
              <span>悟性</span>
              <input
                type="number"
                value={characterForm.comprehension}
                onChange={(event) => setCharacterForm((current) => ({ ...current, comprehension: Number(event.target.value) }))}
              />
            </label>
          </div>
          <button className="primary-button" onClick={() => createCharacterMutation.mutate()}>
            建立角色
          </button>
          <p className="message-box">{message}</p>
        </section>
      </main>
    );
  }

  const character = characterDetailQuery.data;

  const renderPage = () => {
    if (!character) {
      return <SectionCard title="載入中"><p className="muted">正在取得角色詳情...</p></SectionCard>;
    }

    if (activePage === "dashboard") {
      return <DashboardPage character={character} />;
    }

    if (activePage === "cultivation") {
      return (
        <SectionCard title="修練頁" subtitle="Cultivation">
          <div className="form-grid">
            <label className="field">
              <span>修練方式</span>
              <select value={cultivationForm.mode} onChange={(event) => setCultivationForm((current) => ({ ...current, mode: event.target.value }))}>
                <option value="MANUAL_GONGFA">功法掛機</option>
                <option value="MANUAL_STONE">靈石灌注</option>
              </select>
            </label>
            <label className="field">
              <span>分鐘</span>
              <input
                type="number"
                value={cultivationForm.minutes}
                onChange={(event) => setCultivationForm((current) => ({ ...current, minutes: Number(event.target.value) }))}
              />
            </label>
            <label className="field">
              <span>靈石投入</span>
              <input
                type="number"
                value={cultivationForm.spiritStoneSpend}
                onChange={(event) => setCultivationForm((current) => ({ ...current, spiritStoneSpend: Number(event.target.value) }))}
              />
            </label>
          </div>
          <button
            className="primary-button"
            onClick={() =>
              actionMutation.mutate({
                path: `/characters/${character.id}/cultivate`,
                body: cultivationForm
              })
            }
          >
            開始修練
          </button>
        </SectionCard>
      );
    }

    if (activePage === "dungeons") {
      return (
        <SectionCard title="副本頁" subtitle="Dungeon">
          <div className="stack-list">
            {(dungeonsQuery.data ?? []).map((dungeon) => (
              <div key={dungeon.id} className="list-card">
                <div className="list-row">
                  <h3>{dungeon.name}</h3>
                  <span>{dungeon.monster.name}</span>
                </div>
                <p>{dungeon.description}</p>
                <button className="secondary-button" onClick={() => actionMutation.mutate({ path: `/dungeons/${dungeon.id}/enter`, body: { characterId: character.id } })}>
                  挑戰副本
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      );
    }

    if (activePage === "shop") {
      return (
        <SectionCard title="商店頁" subtitle="Shop">
          <div className="stack-list">
            {(shopQuery.data ?? []).map((item) => (
              <div key={item.shopItemId} className="list-card">
                <div className="list-row">
                  <h3>{item.itemName}</h3>
                  <span>{item.price} 靈石</span>
                </div>
                <p>{item.category}</p>
                <div className="inline-controls">
                  <input
                    className="small-input"
                    type="number"
                    min={1}
                    value={purchaseQuantity[item.shopItemId] ?? 1}
                    onChange={(event) => setPurchaseQuantity((current) => ({ ...current, [item.shopItemId]: Number(event.target.value) }))}
                  />
                  <button
                    className="secondary-button"
                    onClick={() =>
                      actionMutation.mutate({
                        path: "/shop/purchase",
                        body: {
                          characterId: character.id,
                          shopItemId: item.shopItemId,
                          quantity: purchaseQuantity[item.shopItemId] ?? 1
                        }
                      })
                    }
                  >
                    購買
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      );
    }

    if (activePage === "alchemy") {
      return (
        <SectionCard title="煉丹頁" subtitle="Alchemy">
          <div className="stack-list">
            {(recipesQuery.data ?? []).map((recipe) => (
              <div key={recipe.code} className="list-card">
                <div className="list-row">
                  <h3>{recipe.name}</h3>
                  <span>成功率 {recipe.successRate}%</span>
                </div>
                <p>{joinNamedMaterials(recipe.ingredients)}</p>
                <button className="secondary-button" onClick={() => actionMutation.mutate({ path: "/alchemy/batches", body: { characterId: character.id, recipeCode: recipe.code } })}>
                  開始煉丹
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      );
    }

    if (activePage === "herbalism") {
      return (
        <div className="page-grid">
          <SectionCard title="藥田格位" subtitle="Herbalism">
            <div className="stack-list">
              {character.herbPlots.map((plot) => (
                <div key={plot.id} className="list-card">
                  <div className="list-row">
                    <h3>藥田 {plot.slotIndex}</h3>
                    <span>{plot.isUnlocked ? "已解鎖" : "未解鎖"}</span>
                  </div>
                  <p>{plot.cropDef ? `${plot.cropDef.name} / ${formatDate(plot.matureAt)}` : "目前空地"}</p>
                  {plot.isUnlocked && !plot.cropDef ? (
                    <div className="button-row">
                      {(cropsQuery.data ?? []).slice(0, 3).map((crop) => (
                        <button
                          key={crop.code}
                          className="secondary-button"
                          onClick={() =>
                            actionMutation.mutate({
                              path: "/herbalism/plant",
                              body: { characterId: character.id, plotId: plot.id, cropCode: crop.code }
                            })
                          }
                        >
                          種植 {crop.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {plot.cropDef ? (
                    <button
                      className="secondary-button"
                      onClick={() => actionMutation.mutate({ path: "/herbalism/harvest", body: { characterId: character.id, plotId: plot.id } })}
                    >
                      收成
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="作物清單" subtitle="Crops">
            <div className="stack-list">
              {(cropsQuery.data ?? []).map((crop) => (
                <div key={crop.code} className="list-card compact">
                  <div className="list-row">
                    <h3>{crop.name}</h3>
                    <span>{crop.growthMinutes} 分鐘</span>
                  </div>
                  <p>需求境界序位 {crop.requiredRealm}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      );
    }

    if (activePage === "forge") {
      return (
        <SectionCard title="鍛造頁" subtitle="Forge">
          <div className="stack-list">
            {(forgeQuery.data ?? []).map((recipe) => (
              <div key={recipe.code} className="list-card">
                <div className="list-row">
                  <h3>{recipe.name}</h3>
                  <span>{recipe.slot}</span>
                </div>
                <p>{joinNamedMaterials(recipe.materials)}</p>
                <button className="secondary-button" onClick={() => actionMutation.mutate({ path: "/forge/batches", body: { characterId: character.id, recipeCode: recipe.code } })}>
                  開始鍛造
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      );
    }

    return (
      <div className="page-grid">
        <SectionCard title="任務" subtitle="Quest">
          <div className="stack-list">
            {(progressionQuery.data?.quests ?? []).map((quest) => (
              <div key={quest.id} className="list-card">
                <div className="list-row">
                  <h3>{quest.questDef.name}</h3>
                  <span>{quest.status}</span>
                </div>
                <p>{quest.questDef.description}</p>
                {quest.status === "COMPLETED" ? (
                  <button className="secondary-button" onClick={() => actionMutation.mutate({ path: `/quests/${quest.questDef.code}/claim`, body: { characterId: character.id } })}>
                    領取獎勵
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="成就與稱號" subtitle="Progression">
          <div className="stack-list">
            {(progressionQuery.data?.achievements ?? []).map((achievement) => (
              <div key={achievement.id} className="list-card">
                <div className="list-row">
                  <h3>{achievement.achievementDef.name}</h3>
                  <span>{achievement.claimedAt ? "已領取" : achievement.unlockedAt ? "可領取" : "未解鎖"}</span>
                </div>
                <p>{achievement.achievementDef.description}</p>
                {achievement.unlockedAt && !achievement.claimedAt ? (
                  <button
                    className="secondary-button"
                    onClick={() => actionMutation.mutate({ path: `/achievements/${achievement.achievementDef.code}/claim`, body: { characterId: character.id } })}
                  >
                    領取成就
                  </button>
                ) : null}
              </div>
            ))}
            <div className="list-card">
              <h3>稱號</h3>
              <p>{(progressionQuery.data?.titles ?? []).join("、") || "暫無稱號"}</p>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  };

  return (
    <main className="game-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">Fairy Cultivation</p>
          <h1>修仙介面</h1>
        </div>

        <label className="field">
          <span>角色</span>
          <select value={selectedCharacterId ?? ""} onChange={(event) => setSelectedCharacterId(event.target.value)}>
            {(charactersQuery.data ?? []).map((characterOption) => (
              <option key={characterOption.id} value={characterOption.id}>
                {characterOption.name}
              </option>
            ))}
          </select>
        </label>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button key={item.key} className={activePage === item.key ? "nav-button active" : "nav-button"} onClick={() => setActivePage(item.key)}>
              {item.label}
            </button>
          ))}
        </nav>

        <button className="secondary-button full-width" onClick={logout}>
          登出
        </button>
      </aside>

      <section className="content-panel">
        <div className="top-banner">
          <div>
            <p className="eyebrow">Current Character</p>
            <h2>{character?.name ?? "載入中"}</h2>
            <p className="muted">{character?.realmLevel?.name ?? "尚未取得境界資料"}</p>
          </div>
          <p className="message-box">{message}</p>
        </div>
        {renderPage()}
      </section>
    </main>
  );
}

export function App() {
  return <AppShell />;
}
