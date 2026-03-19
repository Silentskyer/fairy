# Fairy Cultivation

以凡人流氣質為靈感的線上文字修仙遊戲專案，玩法涵蓋修練升級、打怪副本、商店購買、煉丹、種藥、鍛造與後續任務成長。

## 專案結構

- `apps/web`: Vite + React 前端
- `apps/server`: Fastify API
- `packages/shared`: 共用型別與初始內容資料
- `prisma`: Prisma schema 與 seed
- `docs`: 世界觀、系統設計與部署文件
- `api`: Vercel Serverless API 入口

## 技術選型

- 前端：React、Vite、TypeScript、TanStack Query
- 後端：Fastify、TypeScript、Zod、JWT
- 資料庫：Supabase Postgres
- ORM：Prisma
- 部署：GitHub + Vercel

## 目前已完成

- 世界觀與凡人流修仙背景
- 玩家屬性、境界、修為成長與戰鬥規則
- 副本、商店、煉丹、種藥、鍛造的初版設計
- 初期怪物、地圖、材料、配方與商店資料
- Prisma schema 初版
- Prisma seed 初版
- Vercel API 入口與前端首頁資料串接

## 本機開發

1. 安裝 Node.js 20+
2. 複製 `.env.example` 成 `.env`
3. 準備 PostgreSQL 或直接使用 Supabase 連線字串
4. 執行 `npm install`
5. 執行 `npm run db:generate`
6. 執行 `npm run db:migrate`
7. 執行 `npm run db:seed`
8. 分別啟動 `npm run dev:server` 與 `npm run dev:web`

前端本機會透過 Vite proxy 把 `/api` 轉發到 `http://localhost:3001`。

## 部署方向

- GitHub 作為版本管理
- Vercel 負責網站與 API serverless function
- Supabase 提供 Postgres

詳細部署步驟見 [docs/deployment.md](docs/deployment.md)。
