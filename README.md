# Fairy Cultivation

線上文字修仙網頁遊戲的初始骨架專案，包含：

- `apps/web`: 前端介面骨架
- `apps/server`: 後端 API 骨架
- `packages/shared`: 共用型別與常數
- `prisma`: 資料庫 schema 與 seed 入口
- `docs`: 技術選型與資料庫設計文件

## 建議技術棧

- 前端：React + Vite + TypeScript + React Router + TanStack Query
- 後端：Fastify + TypeScript + Prisma + JWT + Zod
- 資料庫：PostgreSQL
- 部署：Docker Compose（開發）與雲端 VM / 容器平台（正式）

## 當前狀態

目前已完成文件規劃、資料庫 schema 草案與目錄骨架初始化。由於這台環境尚未安裝 `node` / `npm`，所以尚未執行安裝與啟動指令。

## 下一步

1. 安裝 Node.js 20+
2. 安裝套件管理工具（`npm` 或 `pnpm`）
3. 啟動 PostgreSQL 或使用容器
4. 依照 `docs/tech-stack.md` 與 `docs/database-schema.md` 繼續開發 API 與頁面
