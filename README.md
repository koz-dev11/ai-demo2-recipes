# ai-demo2-recipes

AI 利用開発の練習用アプリ。認証なしの公開レシピボード。
個人情報・業務データは入れない。

フロント: https://dhc8gvvdire7.cloudfront.net
API: https://orgoamhsvf.execute-api.ap-northeast-1.amazonaws.com/prod

メモアプリ（`ai-demo1-checklist`）とは別リポジトリ。残す前提であり、こちらの本番リソース・URL・`.env.production`・SAM スタックは使わない。

## 成功条件

レシピの追加・一覧・詳細・編集・お気に入り（ボード全体の星）切替ができ、再読み込み後もデータが残る。
本番では CloudFront 配下で DynamoDB に残ることが確認対象。ローカルでは従来どおり、backend 生存中が確認対象。

## やらないこと

検索、カテゴリ、ログイン。
管理者機能、モバイルアプリ、ソフト削除、一覧からの削除、タグ、添付、リアルタイム同期。
複数枚、リサイズ、サムネイル、S3 上の旧画像の掃除。
追加の `sam deploy` / git commit / push は依頼があるまで行わない（初回デプロイは済み）。
メモリポジトリ（`ai-demo1-checklist`）のファイルは編集しない。

## 構成

フロント: React ＋ TypeScript（ビルド成果を S3 + CloudFront）
API: Python on AWS Lambda
入口: API Gateway (HTTP API)
データ: Amazon DynamoDB（使う場合）
インフラ定義: AWS SAM (`template.yaml`)
企画: OpenSpec（既定スキーマ `spec-driven`）

## SAM の注意（メモスタックと共有しない）

- 想定スタック名: `ai-demo2-recipes`
- テーブル名: `${AWS::StackName}-recipes`（固定名 `Memos` は使わない）
- Lambda FunctionName: `${AWS::StackName}-recipes`
- 環境変数: `RECIPES_TABLE`（`MEMOS_TABLE` ではない）。画像用は `RECIPE_IMAGES_BUCKET` / `RECIPE_IMAGES_PUBLIC_BASE`
- 画像本体は専用バケット（`${AWS::StackName}-recipe-images-${AWS::AccountId}`）。フロント配信用バケット（`dist`）には置かない
- デプロイ時にメモアプリのスタック名・バケット・テーブル・API URL を指定しない
- `frontend/.env.production` には **このスタック** の SAM Output `ApiUrl` だけを書く。メモ側の値をコピーしない

デプロイは人間が Cursor の Serverless MCP で `sam build` / `sam deploy` する。構成の確認と承認は自分で実施する。スタック `ai-demo2-recipes` はデプロイ済み。

- `sam deploy` は必ず `sam build` の成果物（`.aws-sam/build`）を使う。ソースの `CodeUri: backend/` を直接 zip すると Lambda が `fastapi` を import できず 500 になる
- 画像バケット CORS の AllowedOrigins は画面用 CloudFront（`FrontendDistribution`）。`*` ではない。PUT は署名 URL で S3 オリジンへ。画像用 CloudFront は GET
- `ApiUrl` をブラウザでそのまま開くと Not Found になり得る。叩くのは `/prod/api/...`。`VITE_API_URL` は `ApiUrl`（末尾 `/prod`）。`RecipesEndpoint` は使わない

## 画面 / API

| パス | 内容 |
|------|------|
| `/` | 一覧（カード：お気に入り星、画像があれば画像、タイトル＋作成日時。カードで詳細へ。材料は出さない） |
| `/new` | 新規（タイトル必須、材料が手順より上、画面ラベルは「手順（任意）」、JSON は body、画像は任意。本番はファイル選択、ローカルは選択なし） |
| `/recipes/:id` | 詳細（閲覧は材料が「手順」より上。見出し「手順」。空なら「（本文なし）」。編集も材料が上でラベルは「手順（任意）」。画像・星・削除は維持。編集時のファイル選択はアップロード有効時のみ） |

| メソッド | パス | 用途 |
|----------|------|------|
| GET | `/api/config` | `{ imageUploadEnabled }`（メモリモードは false） |
| GET | `/api/recipes` | 一覧 |
| POST | `/api/recipes` | 追加 |
| GET | `/api/recipes/{id}` | 詳細 |
| PATCH | `/api/recipes/{id}` | 部分更新（title / body / favorite / ingredients / imageUrl） |
| POST | `/api/recipes/{id}/image-upload-url` | 署名付き PUT URL（メモリモードは 501） |
| DELETE | `/api/recipes/{id}` | ハード削除（204 / 404） |

レシピの項目: `id`（UUID）, `title`, `body`, `favorite`, `createdAt`, `ingredients`（`[{ "name": string, "amount": string }, ...]`。空配列可）, `imageUrl`（string、空文字可。画像本体ではなく参照）。  
DynamoDB テーブル `${AWS::StackName}-recipes`、PK は `id`。材料と `imageUrl` は同一アイテムの属性。画像本体は専用 S3。一覧は Scan、件数は少ない前提。

## 進捗

本番デプロイ済み。フロントは暖色＋手順レイアウトを CloudFront へ載せ直し済み。ローカルはメモリ dict でファイル選択なし。本番は `imageUploadEnabled` true、署名 PUT を確認済み。本体は専用 S3、`imageUrl` は画像 CDN の参照。フロント配信用バケットには置かない。

### 実装済み（足場）

- `backend/` … FastAPI のレシピ API（一覧・追加・詳細・部分更新・ハード削除）に加え `GET /api/config` と `POST /api/recipes/{id}/image-upload-url`。`RECIPES_TABLE` があるときは DynamoDB（PK `id`、Scan、`createdAt` 降順）、無いとき（および `AWS_SAM_LOCAL`）はメモリ dict。Lambda は `main.handler`（Mangum、`lifespan=off`、base path `prod`）。CORS は FastAPI ではなく API Gateway 側。デプロイ後に `…/prod/api/recipes` が 404 なら、まずこの prefix を疑う
- `frontend/` … 3 画面（`/` `/new` `/recipes/:id`）。詳細の閲覧モードから削除（confirm 後に一覧へ）。ローカルは `VITE_API_URL` なしで相対パス `/api/recipes`（Vite が `http://127.0.0.1:8000` にプロキシ）。本番ビルドは `frontend/.env.production` の `VITE_API_URL`＝このスタックの SAM Output `ApiUrl`（`/prod` は落とさない）
- お気に入りはボード全体の星（認証なし）。`done` は使わない
- 材料は `ingredients` 配列（`name` / `amount` は人が読む文字列）。新規・詳細で行の追加・削除・編集。一覧カードには出さない
- 画像は `imageUrl` 参照のみ。本体は専用 S3（`template.yaml` の `RecipeImagesBucket`）。ブラウザが署名付き URL で PUT。一覧・詳細は `imageUrl` があれば表示。アップロード有効時のみファイル選択（1枚、jpeg/png/webp）。CORS の AllowedOrigins は画面用 CloudFront。再デプロイは `sam build` の成果物経由

### 未着手

- 検索、カテゴリ、ログイン

## リポジトリ

`frontend/`（React）、`backend/`（FastAPI）、`template.yaml`（SAM）、`openspec/`（企画）。`frontend/.env.example` はリポジトリに含む。`frontend/.env.production` は git 対象外。`AGENTS.md` は人間管理。

### バックエンドのローカル起動

Docker は不要。Python 3 があれば動く。PowerShell では `Activate.ps1` を使わず、venv の `python.exe` を直接指定する。

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
```

API は http://127.0.0.1:8000 で起動する。ローカルは `RECIPES_TABLE` 無しのためメモリ上に保持し、再起動すると消える。本番の DynamoDB とは別。メモアプリのテーブルとも別。

単体テスト（メモリモード）:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest
```

8000 番が使用中で `WinError 10013` になるときは、別ポートにする。

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8001
```

この場合の URL は http://127.0.0.1:8001 。フロントと併用するときは Vite のプロキシ先が 8000 なので、backend は 8000 で起動する。

### フロントエンドのローカル起動

Node.js が必要（Vite 7 は 20.19+ または 22.12+）。先に backend を 8000 番で起動する。ローカルは `VITE_API_URL` を空のまま（`.env` に本番 URL を書かない）。相対パス `/api/recipes` を Vite が `http://127.0.0.1:8000` へプロキシする（CORS は使わない）。本番ビルドは `frontend/.env.production` に **このスタック** の SAM Output `ApiUrl` を書く（末尾スラッシュなし、`/prod` は残す。形は `https://xxxx.execute-api.ap-northeast-1.amazonaws.com/prod`）。`VITE_API_URL` に入れるのは `ApiUrl`。`RecipesEndpoint` は使わない。メモアプリの API URL は使わない。`VITE_API_URL` はビルド時に JS へ埋め込まれる。デプロイ後に S3 上のファイルを書き換えても変わらない。API URL を変えるときは `.env.production` を直して `npm run build` し直す。

```powershell
cd frontend
npm install
npm run dev
```

ブラウザで http://127.0.0.1:5173 を開く。追加・一覧・詳細・編集・お気に入り切替はフロントから操作する。backend が起動中なら、フロントを再読み込みしてもデータは残る。

本番フロントの載せ直し: `frontend/.env.production` にこのスタックの SAM Output `ApiUrl`（`…/prod`）を書き、`npm run build` する。`dist` を SAM Output の `FrontendBucketName` へ同期し、CloudFront を `/*` で無効化する。
