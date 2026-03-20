# Fairy Cultivation

一個以文字修仙為核心的網頁遊戲專案，部署目標為：

- GitHub：版本管理
- Vercel：網站與 API Serverless
- Supabase：Postgres 雲端資料庫

目前已經具備：

- 前端遊戲介面
- Fastify 後端 API
- Prisma schema 與 seed
- Vercel API 入口
- 適合 monorepo 的 build 流程

## 專案結構

- `apps/web`：Vite + React 前端
- `apps/server`：Fastify API
- `packages/shared`：共用型別與初始資料
- `prisma`：Prisma schema 與 seed
- `api`：Vercel Serverless API 入口
- `docs`：世界觀、系統設計與部署文件

## 技術棧

- Frontend：React、Vite、TypeScript、TanStack Query
- Backend：Fastify、TypeScript、Zod、JWT
- Database：Supabase Postgres
- ORM：Prisma
- Deploy：Vercel

## 本機開發

1. 複製 `.env.example` 為 `.env`
2. 填入 `DATABASE_URL`、`DIRECT_URL`、`JWT_SECRET`
3. 安裝依賴：`npm install`
4. 產生 Prisma Client：`npm run db:generate`
5. 建立資料表：`npm run db:migrate`
6. 匯入種子資料：`npm run db:seed`
7. 啟動後端：`npm run dev:server`
8. 啟動前端：`npm run dev:web`

## Vercel 部署重點

- Root Directory：專案根目錄
- Install Command：`npm install`
- Build Command：`npm run vercel-build`
- Output Directory：`apps/web/dist`
- Node 版本：`20.x`
- 環境變數：
  - `DATABASE_URL`
  - `DIRECT_URL`
  - `JWT_SECRET`
  - `VITE_API_BASE_URL=/api`
  - `SUPABASE_PROJECT_URL`
  - `SUPABASE_ANON_KEY`

## 已驗證

- `npm install`
- `npm run build`

這代表目前專案格式已適合推上 GitHub，並作為 Vercel + Supabase 的部署基礎。

詳細部署步驟可看 [docs/deployment.md](docs/deployment.md)。
