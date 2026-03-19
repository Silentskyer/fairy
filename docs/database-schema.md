# 資料庫 Schema 草案

## 核心設計

資料以「帳號 > 角色 > 角色資產 / 系統紀錄」為主軸，將可擴充的遊戲內容拆成定義表與玩家實例表兩類。

## 主要資料表

### 帳號與角色

- `users`: 使用者帳號、登入資訊
- `characters`: 玩家角色本體
- `realm_levels`: 境界定義

### 道具與背包

- `item_defs`: 道具主定義
- `inventory_slots`: 玩家背包欄位
- `equipment_instances`: 裝備實例

### 戰鬥與副本

- `monster_defs`: 怪物定義
- `dungeon_defs`: 副本定義
- `dungeon_runs`: 玩家副本紀錄
- `battle_logs`: 戰鬥紀錄
- `loot_records`: 掉落紀錄

### 商店

- `shop_items`: 商店商品定義
- `purchase_records`: 購買紀錄

### 煉丹

- `alchemy_recipes`: 丹方
- `alchemy_recipe_ingredients`: 丹方材料
- `alchemy_batches`: 玩家煉丹紀錄

### 種藥

- `crop_defs`: 作物定義
- `herb_plots`: 玩家藥田
- `crop_cycles`: 種植週期與收成紀錄

### 鍛造

- `forge_recipes`: 鍛造配方
- `forge_recipe_materials`: 配方材料
- `forge_batches`: 玩家鍛造紀錄

### 任務與成就

- `quest_defs`: 任務定義
- `character_quests`: 玩家任務狀態
- `achievement_defs`: 成就定義
- `character_achievements`: 玩家成就狀態

## 設計原則

- 遊戲內容與玩家進度分離，便於改版與平衡
- 可重複行為保留紀錄表，方便追查作弊與做統計
- 裝備採實例表，支援品質、詞條、耐久、強化等後續擴充
