## Context

動機は `proposal.md` の Why を参照。振る舞いの契約は `specs/recipe-board/spec.md`。

コードは既にある。フロントは React 19 + TypeScript + Vite 7（`/`、`/new`、`/recipes/:id`）。API は FastAPI 単一ファイル `backend/main.py` を Mangum で Lambda 化する。インフラは `template.yaml`（想定スタック名 `ai-demo2-recipes`）。本番は未デプロイ。ローカル確認はメモリ dict 上の backend 生存中が対象。

この change の「実装」は新機能ではなく、現行構成が spec と一致するかの確認と、不一致時の最小修正である。

## Goals / Non-Goals

**Goals:**

- 現行の層（画面 → `api.ts` → `/api/recipes` → store）を baseline として固定する
- 保存先切替（`RECIPES_TABLE` 未設定または `AWS_SAM_LOCAL` ならメモリ、それ以外は DynamoDB）を変えない
- CORS は本番 API Gateway、ローカルは Vite `/api` プロキシのままにする（FastAPI に CORS ミドルウェアを足さない）
- メモアプリ（`ai-demo1-checklist`）とスタック・テーブル・URL を共有しない命名を維持する

**Non-Goals:**

- 材料リスト、検索、カテゴリ、画像、ログイン、GSI、ページング、ソフト削除
- `backend/main.py` の分割、状態管理ライブラリ、コンポーネントライブラリの導入
- `sam deploy`、git commit / push、`template.yaml` への新規リソース
- メモアプリからのデータ移行

## Decisions

### 1. FastAPI 単一ファイルと store 関数

- 決定: HTTP / バリデーションはルート、永続化は `_list_recipes_store` などの `_…_store`。Lambda 入口は `main.handler`（Mangum、`lifespan="off"`、`api_gateway_base_path="prod"`）
- 理由: デプロイ後のパスは `…/prod/api/recipes`。base path を落とすと 404 になる。単一ファイルは現行の練習用規模に合う
- 代替: パッケージ分割や FastAPI の CORS ミドルウェア → 規模に対して過剰で、ローカル CORS 方針とも衝突する

### 2. 保存先は環境変数で切替

- 決定: `_use_memory()` が真（`RECIPES_TABLE` なし、または `AWS_SAM_LOCAL`）ならプロセス内 dict。偽なら DynamoDB（PK `id`、一覧は Scan、`createdAt` 降順はアプリ側ソート）
- 理由: ローカルは Docker / テーブルなしで動かす。件数は少ない前提なので Scan で足りる
- 代替: ローカルも DynamoDB Local、一覧を GSI の Query → 足場の複雑さが増えるだけなので採用しない

### 3. お気に入りは `favorite` のボード全体星

- 決定: boolean `favorite`。認証なしのため利用者別ストアは持たない。切替は PATCH `{ "favorite": true|false }`
- 理由: メモ足場の `done` をレシピの星に読み替えた現行契約。仕様の正は README
- 代替: 利用者別お気に入りや `done` のまま → 認証なしボードと項目契約に合わない

### 4. フロントは相対 `/api` と本番 `ApiUrl`

- 決定: 画面は `api.ts` だけを呼ぶ。ローカルは `VITE_API_URL` 空で相対 `/api/recipes`（Vite が `http://127.0.0.1:8000` へプロキシ）。本番ビルドは `frontend/.env.production` の `VITE_API_URL`＝このスタックの SAM Output `ApiUrl`（末尾スラッシュなし、`/prod` は残す）。`RecipesEndpoint` もメモアプリの URL も使わない
- 理由: ローカルで FastAPI CORS が不要。本番は API Gateway の CORS。`VITE_API_URL` はビルド時埋め込み
- 代替: FastAPI CORS でフロントから API オリジンへ直接 → ローカルと本番の経路が割れ、禁止事項に触れる

### 5. 削除は詳細のハード削除のみ

- 決定: DELETE は 204 / 404。UI は詳細の閲覧モードで confirm してから。一覧に削除は置かない
- 理由: README のやらないこと（ソフト削除、一覧からの削除）
- 代替: 一覧削除や論理削除 → 対象外

### 6. メモアプリと資源を分けた SAM 名

- 決定: 想定スタック `ai-demo2-recipes`。テーブル `${AWS::StackName}-recipes`、FunctionName `${AWS::StackName}-recipes`、環境変数 `RECIPES_TABLE`。固定名 `Memos` / `MEMOS_TABLE` / `/api/memos` は使わない
- 理由: メモ本番リソース・URL を共有すると壊れる
- 代替: メモスタックへの相乗り → 禁止

## Risks / Trade-offs

- [Risk] メモリ dict は backend 再起動で消える → ローカル成功条件は「backend 生存中の再読み込み」。本番 DynamoDB の永続は未デプロイのためこの change では検証しない
- [Risk] Scan は件数増で遅くなる → 件数少ない前提。GSI は後続 change
- [Risk] 認証なしのため誰でも CRUD・星切替できる → 公開練習ボードの意図。個人情報・業務データは入れない
- [Risk] メモアプリの `.env.production` やスタック名を誤って使う → spec と SAM 命名で分離。apply では新規デプロイをしない
- [Trade-off] 単一ファイルと Scan は単純さと将来の分割コストの交換。baseline では単純さを取る

## Migration Plan

データ移行はない（新テーブルへ既存メモを移さない）。本番デプロイはこの change の対象外。

apply 時:

1. 現行コードとテストを spec と照合する
2. 不一致があれば契約を満たす最小修正のみ行う
3. 一致していればアプリケーションコードと `template.yaml` は触らない
4. rollback は git で当該修正を戻す（この change では commit しない）

## Open Questions

なし。未デプロイであることは既知で、この change の tasks を変えない。
