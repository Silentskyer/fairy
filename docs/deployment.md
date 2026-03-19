# 部署說明

本專案預設部署路線為：

- GitHub：版本管理
- Vercel：前端網站 + `/api` serverless function
- Supabase：Postgres 雲端資料庫

## 1. Supabase

1. 建立新專案
2. 取得 `DATABASE_URL` 與 `DIRECT_URL`
3. 將連線字串填入 Vercel 專案環境變數

建議：

- `DATABASE_URL` 使用 Supabase pooler 連線
- `DIRECT_URL` 使用 direct connection，供 Prisma migration 使用

## 2. GitHub

1. 將本專案推到 GitHub
2. 確認 `main` 分支為主要部署分支

## 3. Vercel

1. 匯入 GitHub 倉庫
2. Framework Preset 選擇 `Vite`
3. Root Directory 保持在專案根目錄，不要設成 `apps/server` 或 `apps/web`
4. Build Command 使用 `npm run vercel-build`
5. Output Directory 使用 `apps/web/dist`

## 4. Vercel 環境變數

至少加入：

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `VITE_API_BASE_URL=/api`
- `SUPABASE_PROJECT_URL`
- `SUPABASE_ANON_KEY`

## 5. Prisma

首次部署前先執行：

1. `npm install`
2. `npm run db:generate`
3. `npm run db:migrate`
4. `npm run db:seed`

如果你要把 migration 完全交給雲端流程，也可以在本地先連 Supabase 建好 schema 後再推上去。

## 6. 目前 Vercel 路由方式

- `vercel.json` 已設定前端輸出目錄
- `api/[...route].ts` 會把 `/api/*` 轉交給 Fastify
- 前端預設直接打 `/api`

## 7. 下一步建議

- 串接 Supabase Auth 或自建帳密登入
- 建立正式角色建立 API
- 補上商店購買、修練掛機、進副本結算等寫入型 API
- 加入 GitHub Actions 或 Vercel Preview workflow
