# Deployment Guide

本專案預設部署方式：

- GitHub：原始碼管理
- Vercel：前端站點與 `/api` Serverless 路由
- Supabase：Postgres 資料庫

## 1. Supabase

先在 Supabase 建立專案，取得以下環境變數：

- `DATABASE_URL`
- `DIRECT_URL`
- `SUPABASE_PROJECT_URL`
- `SUPABASE_ANON_KEY`

建議：

- `DATABASE_URL` 使用 pooler
- `DIRECT_URL` 使用 direct connection，供 Prisma migration 使用

## 2. Vercel

建立 Vercel 專案時請確認：

- Root Directory：專案根目錄
- Framework Preset：Vite
- Install Command：`npm install`
- Build Command：`npm run vercel-build`
- Output Directory：`apps/web/dist`

不要把 Root Directory 設成 `apps/server` 或 `apps/web`。
如果設錯，Vercel 可能會自動改用 `npm install --prefix=../..`，這在 monorepo 下容易出現安裝錯誤。

## 3. Vercel 環境變數

至少加入以下項目：

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `VITE_API_BASE_URL=/api`
- `SUPABASE_PROJECT_URL`
- `SUPABASE_ANON_KEY`

## 4. Prisma

第一次部署前，建議先在本地或 CI 執行：

1. `npm install`
2. `npm run db:generate`
3. `npm run db:migrate`
4. `npm run db:seed`

## 5. 路由結構

- `vercel.json` 負責設定前端輸出目錄與 rewrite
- `api/[...route].ts` 會把 `/api/*` 轉給 Fastify
- 前端以 `/api` 作為預設 API base URL

## 6. 目前適合部署的原因

- 已有 `package-lock.json`
- 已有 workspace-safe 的 Prisma schema 路徑
- 已有可通過的 production build
- 已有適合 Vercel 的 `vercel-build` 腳本

## 7. 下一步建議

- 在 Supabase 正式執行 migration 與 seed
- 在 Vercel 設定所有環境變數
- 建立 Preview / Production 兩組環境
- 上線後檢查登入、角色建立、修練、副本、商店、生產 API
