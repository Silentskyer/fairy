# 技術選型

## 選型結論

### 前端

- 框架：React
- 建置工具：Vite
- 語言：TypeScript
- 路由：React Router
- 狀態與資料請求：TanStack Query
- 樣式：CSS Variables + 模組化 CSS，後續可視需求加入 Tailwind

### 後端

- 框架：Fastify
- 語言：TypeScript
- 驗證：Zod
- 身分驗證：JWT
- ORM：Prisma

### 資料庫

- 開發：PostgreSQL
- 正式：PostgreSQL
- 理由：關聯性強、交易一致性好，適合角色、背包、掉落、鍛造等多表互動

### 部署

- 開發：Docker Compose 啟動 PostgreSQL
- 正式：前端靜態部署 + 後端容器化部署 + PostgreSQL 獨立資料庫

## 選型理由

### React + Vite

- 開發迭代快，適合先做文字遊戲管理頁與功能頁
- 前後端切分清楚，之後改成 SSR 也容易遷移

### Fastify

- 效能佳，結構輕，適合中小型遊戲 API
- 插件體系明確，易加入認證、日誌與驗證

### Prisma + PostgreSQL

- schema 可讀性高，便於後續擴充
- 適合處理角色成長、背包、商店、任務等多關聯資料

## 初版里程碑

1. 完成認證、角色、背包、修練基礎 API
2. 完成商店與副本戰鬥流程
3. 完成煉丹、種藥、鍛造三大生產系統
4. 完成任務、成就與數值調整
5. 完成測試、部署與正式環境配置
