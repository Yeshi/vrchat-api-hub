# admin-ui

Playlist editor — React + TypeScript + Vite.  
Cloudflare Workers (`../api`) にプレイリストデータを保存・読み出しするフロントエンド。

---

## ローカル開発

2 つのサーバーを別々のターミナルで起動する。

```bash
# ターミナル 1 — API サーバー (port 5173)
cd ../api
npm run dev

# ターミナル 2 — Admin UI (port 5174)
npm run dev
# → http://localhost:5174
```

Vite の dev proxy が `/api/*` を `localhost:5173` に転送するので、  
ローカルでは環境変数の設定は不要。

---

## 環境変数

| 変数名 | 説明 | 例 |
|---|---|---|
| `VITE_API_BASE_URL` | 本番 Workers の URL | `https://api.your-account.workers.dev` |

ローカルでは未設定でよい（デフォルトで `/api` プロキシを使用）。

`.env.example` をコピーして `.env.local` を作れば個別に上書きできる。

```bash
cp .env.example .env.local
# .env.local を編集
```

---

## Cloudflare Pages へのデプロイ

### 1. ビルド確認

```bash
npm run build
# → dist/ に出力される
```

### 2-A. CLI でデプロイ（推奨）

```bash
npm run build
npx wrangler pages deploy dist --project-name=admin-ui
```

初回は対話形式でプロジェクトが作成される。

### 2-B. ダッシュボードから Git 連携でデプロイ

Cloudflare Pages ダッシュボード → **Create application** → **Connect to Git**

| 設定項目 | 値 |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `admin-ui` |

### 3. 環境変数を Pages に設定

Pages ダッシュボード → Settings → Environment variables → **Production**

```
VITE_API_BASE_URL = https://api.your-account.workers.dev
```

`VITE_` プレフィックスが必要（Vite がビルド時に埋め込む）。  
設定後、再デプロイ（Retry deployment）すること。

---

## API エンドポイント

| Method | Path | 説明 |
|---|---|---|
| `GET` | `/playlists` | 全プレイリストを取得 |
| `PUT` | `/playlists` | 全プレイリストを上書き保存 |
