# Serena Project Rules — ai-demo2-recipes

この文書は、Serena MCP を使って **Spec / Plan / Build** を行うときのプロジェクト固有ルールである。  
人間が管理する `AGENTS.md` と矛盾する場合は **`AGENTS.md` を優先**する。本ファイル自体の変更は、人間の明示依頼があるときだけ行う。

Serena は `--context ide` で動く前提とする。このコンテキストでは `list_dir` / `read_file` は Serena 側に公開されない。ファイル一覧と非コードファイルの全文は Cursor の読み取り専用操作で代替し、コード探索は `search_for_pattern` と（Language Server が使える場合は）記号ツールを使う。

---

## 1. プロジェクト概要と技術スタック

### 概要

AI 利用開発の練習用アプリ。認証なしの公開レシピボードである。

- 認証なしの公開ボード
- 個人情報・業務データは入れない
- 成功条件: レシピの追加・一覧・詳細・編集・お気に入り（ボード全体の星）切替ができ、CloudFront 配下で再読み込み後もデータが残る

材料リスト（`ingredients`）と `imageUrl` は実装済み。画面・API・JSON（材料＋画像）の正は `openspec/specs/recipe-board/spec.md` である。本ルールから specs は編集しない。

README の「やらないこと」はスコープ外である。ユーザーが明示しない限り実装しない。

- 検索、カテゴリ、ログイン
- 管理者機能、モバイルアプリ、ソフト削除、一覧からの削除、タグ、添付、リアルタイム同期
- 複数枚、リサイズ、サムネイル、S3 上の旧画像の掃除

`ai-demo1-checklist`（メモアプリ）は残す前提の別リポジトリである。本番リソース・URL・`.env.production`・SAM スタックを共有しない。

### 技術スタック（リポジトリの実ファイルから確認）

| 層 | 実体 | 根拠 |
|----|------|------|
| フロント | React 19、TypeScript 5.9、Vite 7、react-router-dom 7 | `frontend/package.json` |
| フロント実行 | ローカル Vite（`127.0.0.1:5173`）、本番は S3 + CloudFront | `README.md`、`template.yaml` |
| API | FastAPI、Pydantic、Uvicorn、Mangum、boto3 | `backend/requirements.txt`、`backend/main.py` |
| 入口 | API Gateway HTTP API（stage `prod`） | `template.yaml` |
| データ | 本番 DynamoDB テーブル `${AWS::StackName}-recipes`（PK `id`）。ローカルはメモリ `dict` | `backend/main.py`、`template.yaml` |
| インフラ | AWS SAM（`template.yaml`）。Lambda runtime `python3.14`。想定スタック名 `ai-demo2-recipes` | `template.yaml`、`README.md` |
| ルートの Python プロジェクト定義 | **なし**（`pyproject.toml` は無い） | ディレクトリ実体 |
| バックエンドテスト | `backend/tests/` + pytest（`backend/requirements-dev.txt`） | ディレクトリ実体 |
| フロント E2E | Playwright（`frontend/tests/`）。必須ゲートではない | `frontend/package.json` |

`package.json` / `composer.json` / `pyproject.toml` はリポジトリルートに無い。フロントは `frontend/package.json`、バックエンドは `backend/requirements.txt` がソースである。

### 稼働中の本番 URL

未デプロイ。メモアプリ（`ai-demo1-checklist`）の CloudFront / execute-api URL をこのリポジトリの契約に書かない・使わない。

デプロイは人間が Cursor の Serverless MCP で `sam build` / `sam deploy` する。Serena はデプロイを実行しない。

---

## 2. ディレクトリ構成と責務境界

リポジトリルートに `src/` や `app/` は無い。アプリ本体は `frontend/` と `backend/` に分かれる。

```
ai-demo2-recipes/
  AGENTS.md                 # 人間管理。Serena は編集しない
  README.md                 # 成功条件・やらないこと・起動手順
  template.yaml             # SAM。本番インフラの正。画像用バケットと別 CloudFront あり。Serena はデプロイしない
  docs/rules/               # 本ルール（人間承認後は契約）
  openspec/                 # OpenSpec（既定スキーマ spec-driven）。`specs/recipe-board/spec.md` が材料＋画像の正
  backend/
    main.py                 # FastAPI アプリとストア実装のすべて
    requirements.txt
    requirements-dev.txt
    tests/                  # pytest。メモリモード
    .samignore
  frontend/
    package.json
    vite.config.ts          # 本番ビルド時 VITE_API_URL 必須、/api プロキシ
    tsconfig.json
    .env.example            # リポジトリに含める
    .env.production         # git 対象外。Serena は作らない・読まない・書かない
    src/
      main.tsx              # エントリ（BrowserRouter）
      App.tsx               # ルート定義のみ
      api.ts                # レシピ API クライアントと型
      index.css             # グローバルスタイル（暖色。乳白＋テラコッタ。星 --star は金）
      pages/                # 画面。1 ルート 1 ファイル
        ListPage.tsx
        NewPage.tsx
        DetailPage.tsx
```

### 責務境界

| 場所 | やってよいこと | やってはいけないこと |
|------|----------------|----------------------|
| `frontend/src/pages/` | 画面状態、フォーム、遷移、日本語 UI | `fetch` の直呼び、API パス組み立て |
| `frontend/src/api.ts` | HTTP クライアント、`Recipe` 型、パス `/api/recipes` | UI、ルーティング、環境ファイルの書き換え |
| `frontend/src/App.tsx` | ルートと未知 URL | データ取得ロジックの肥大化 |
| `frontend/vite.config.ts` | ローカル `/api` → `127.0.0.1:8000` | 本番 URL のハードコード |
| `backend/main.py` の `@app.*` | HTTP 契約（ステータス、404、201、204） | DynamoDB / メモリの詳細をルート関数に散らす |
| `backend/main.py` の `_..._store` | メモリ / DynamoDB の分岐 | FastAPI のレスポンス装飾、CORS 追加 |
| `template.yaml` | API パス、CORS、DynamoDB、フロント CloudFront の SPA フォールバック、画像用バケットと別 CloudFront | アプリのビジネスロジック。Serena は `sam deploy` しない |
| `README.md` | 成功条件・起動手順・やらないことの正 | レシピ JSON / 画面の詳細は `openspec/specs/recipe-board/spec.md` を正とする |
| `openspec/specs/recipe-board/spec.md` | レシピボード（材料＋画像）の画面・API・JSON の正 | ユーザー明示なしに編集しない |

フロントと API は別オリジンになり得る。ローカルは Vite プロキシで CORS を使わない。本番 CORS は **API Gateway**（`template.yaml` の `CorsConfiguration`）が担う。FastAPI に CORS ミドルウェアを足さない。

---

## 3. 命名規約・レイヤリング・既存設計の前提

### 画面と API 契約

| 画面パス | 内容 |
|----------|------|
| `/` | 一覧。カード（お気に入り星、画像があれば画像、タイトル、作成日時）。カード全体で詳細へ。材料は出さない |
| `/new` | 新規。タイトル必須、材料が手順より上、画面ラベルは「手順（任意）」、JSON は body、画像は任意。本番はファイル選択、ローカルは選択なし |
| `/recipes/:id` | 詳細。閲覧は材料が「手順」より上。見出し「手順」。空なら「（本文なし）」。編集も材料が上でラベルは「手順（任意）」。画像・星・削除は維持（閲覧モードのみ、`confirm` 後に一覧へ）。編集のファイル選択はアップロード有効時のみ |
| その他 | 「ページが見つかりません。」 |

| メソッド | パス | 用途 | 主な結果 |
|----------|------|------|----------|
| GET | `/api/config` | `{ imageUploadEnabled }` | メモリモードは `false` |
| GET | `/api/recipes` | 一覧 | 配列。`createdAt` 降順 |
| POST | `/api/recipes` | 追加 | 201。`id` は UUID、`favorite` は `false`、`ingredients` 省略時は `[]`、`imageUrl` 省略時は `""` |
| GET | `/api/recipes/{id}` | 詳細 | 404 なら `Recipe not found` |
| PATCH | `/api/recipes/{id}` | `title` / `body` / `favorite` / `ingredients` / `imageUrl` の部分更新 | 404 同様 |
| POST | `/api/recipes/{id}/image-upload-url` | 署名付き PUT URL | メモリモードは 501 |
| DELETE | `/api/recipes/{id}` | ハード削除 | 204 / 404 |

レシピ項目（JSON は **camelCase**）:

- `id`（UUID 文字列）
- `title`
- `body`
- `favorite`（boolean。ボード全体の星。認証なし）
- `createdAt`（UTC ISO 8601）
- `ingredients`（`[{ "name": string, "amount": string }, ...]`。空配列可。同一 DynamoDB アイテムのネスト属性）
- `imageUrl`（string、空文字可。参照のみ。同一 DynamoDB アイテム。本体は専用 S3）

カテゴリはデータ項目に含めない（ユーザーが明示したときだけ）。

DynamoDB テーブル名は `${AWS::StackName}-recipes`、PK は `id`。固定名 `Memos` は使わない。一覧は `Scan`。件数は少ない前提なのでページングは導入しない。

### 命名

- フロントコンポーネント: PascalCase（`ListPage`、`DetailPage`）
- フロント関数・フック相当: camelCase（`listRecipes`、`patchRecipeFavorite`）
- フロント型: `Recipe`、`RecipePatch`
- バックエンド公開ルート: snake_case（`list_recipes`、`create_recipe`）
- バックエンド私有: 先頭 `_`（`_use_memory`、`_list_recipes_store`）
- Pydantic: `RecipeCreate`、`RecipePatch`
- パスパラメータ: バックエンドは `recipe_id`、フロントは `id`

### レイヤリング

1. 画面（`pages/`）→ `api.ts` のみを呼ぶ
2. `api.ts` は `VITE_API_URL`（空なら相対パス）+ `/api/recipes...` で `fetch`
3. FastAPI ルートはバリデーションと HTTP 例外だけを持ち、永続化は `_..._store`
4. `_use_memory()` が真ならプロセス内 `dict`、偽なら DynamoDB  
   真になる条件: `RECIPES_TABLE` 未設定、または `AWS_SAM_LOCAL` が立っている
5. Lambda 入口は `main.handler`（`Mangum(app, lifespan="off", api_gateway_base_path="prod")`）

### 既存実装で守る前提

- タイトルはサーバ側で `strip`。空白のみは 422（Pydantic `min_length=1`）
- フロントもタイトル必須を trim して検査する
- 材料行は保存前に `name` / `amount` を strip。両方空（空白のみ含む）の行は捨てる。片方だけ空は 422。空配列は可。順序は入力順。数値換算・単位マスタはしない
- `imageUrl` は参照文字列。本体は `RecipeImagesBucket`（フロント配信用バケットには置かない）。ブラウザが署名付き URL で S3 に PUT。バイナリを Lambda / API Gateway / DynamoDB に流さない
- ローカル（`_use_memory()` / `RECIPES_TABLE` 未設定）は `GET /api/config` が `{ "imageUploadEnabled": false }`、ファイル選択なし、署名 URL は 501。PATCH の `imageUrl` 省略は据え置き、`""` はクリア、GET 欠落は `""`
- 新規投稿・お気に入りトグル・保存・削除は二重送信防止（`useRef` + `disabled`）
- 一覧の星はカード遷移と分離（`stopPropagation`）
- 詳細のエラーは id 変更時にクリアする。404 は「レシピが見つかりません。」
- UI 文言は日本語。見た目は中央寄せの暖色（乳白＋テラコッタ。`index.css` の CSS 変数。星は金）。コンポーネントライブラリは導入しない
- 状態管理ライブラリは使わない。ページ内 `useState` / `useEffect` で足りる規模を維持する
- バックエンドは当面単一ファイル。レイヤ分割はユーザーが明示したときだけ
- `VITE_API_URL` にはこのスタックの SAM Output **`ApiUrl`**（`.../prod`、末尾スラッシュなし）を使う。`RecipesEndpoint` は使わない（`/api/recipes` が二重になる）。メモスタックの URL は使わない
- 本番ビルドで `VITE_API_URL` が空なら `vite.config.ts` が失敗する。これは意図どおり
- ローカル開発では `.env` に本番 URL を書かない。Vite が `/api` を `http://127.0.0.1:8000` へプロキシする
- Windows ローカルでは venv の `Activate.ps1` を使わず `.\.venv\Scripts\python.exe` を直接指定する（README の手順）

---

## 4. Spec フェーズで許可される操作と禁止事項

目的は「何を作るか / 何を変えるか」を文書化し、コードを変えないこと。

### 許可

- 読み取り専用の調査: `search_for_pattern`、記号ツール（LS が利用可能なとき）、Cursor のファイル読み取り
- `AGENTS.md`、`README.md`、本ルール、`openspec/specs/recipe-board/spec.md`（材料＋画像の正）、既存コード、`template.yaml` を契約の入力にする
- OpenSpec の change 成果物（`openspec/changes/`）をスキーマに従って書く（ユーザーが企画を求めている場合）
- 不明点は推測で埋めず、質問する
- 画面・API・データ項目・非機能（ローカルメモリ vs DynamoDB、CORS、`/prod` prefix）への影響を明記する

### 禁止

- アプリケーションコード、`template.yaml`、依存ファイルの編集
- `AGENTS.md` の編集
- git commit / push、`sam build` / `sam deploy`、本番データの操作
- README の「やらないこと」を Spec の範囲に勝手に入れる
- 認証・個人情報・業務データを前提にした設計
- メモアプリの本番リソースをこのアプリの前提にすること
- Serena メモリへの機密（アカウント ID、キー、`.env.production` の中身、メモ側の本番 URL）の保存
- Language Server が落ちているときに、未確認の記号編集ツールで「直したつもり」になること。Spec では編集ツールを使わない

Spec の出力には少なくとも次を含める。

- 変更しないこと（既存契約の維持）
- 変更すること（画面 / API / データ）
- 成功条件と確認手順（ローカル、必要なら本番の観点）
- 対象外（やらないこと）

---

## 5. Plan フェーズで許可される操作と禁止事項

目的は、Spec を既存構造に乗せる手順に落とすこと。まだ実装しない。

### 許可

- Spec と同じ読み取り専用調査
- 触るファイルをパス単位で列挙する
- レイヤ境界に沿った変更順（例: `api.ts` → ページ → `main.py` の store → ルート → 必要なら `template.yaml`）を書く
- リスク（`/prod` の 404、メモリと DynamoDB の分岐漏れ、Vite プロキシ、CloudFront SPA フォールバック、メモスタックとの取り違え）を書く
- OpenSpec の `design.md` / `tasks.md` をスキーマに従って書く（ユーザーが成果物を求めている場合）
- Build 後の確認方法（pytest メモリモード、ローカル API、画面操作、必要なら型チェック `npm run build`）を計画に含める

### 禁止

- コード・インフラ・依存関係の編集
- Spec に無い機能の追加計画
- 「ついで」のリファクタ、ディレクトリ分割、状態管理ライブラリ導入
- FastAPI への CORS 追加や、ローカルで execute-api を直呼びする構成変更
- テストフレームワークの大規模導入を、ユーザー依頼なしに計画の必須条件にしない
- コミット、デプロイ、本番 DynamoDB の中身を変える手順を Serena の作業として書かない（人間が Serverless MCP で行う旨は書いてよい）

Plan の各ステップは、Build で 1 回の編集単位になる粒度にする。単一ファイルの `backend/main.py` では、ルートと `_..._store` のどちらを変えるかを明示する。

---

## 6. Build フェーズで許可される操作と禁止事項

目的は、承認済み Spec / Plan だけを実装すること。OpenSpec では承認済み change の `tasks.md` が正である。

### 許可

- 第 9 節の「編集してよいファイル」への、Plan / tasks に書いた変更
- Serena のファイル編集・記号編集ツール（対象が許可範囲のとき）
- フロントの型チェックとして `frontend` で `npm run build` 相当の確認（ローカル実行はユーザー環境。Serena の `execute_shell_command` は ide コンテキストでは非公開）
- バックエンドは `backend/tests` をメモリモードで維持する（既存パターン）
- 既存パターンの踏襲: 二重送信防止、日本語エラー、`api.ts` 経由、`_use_memory()` 分岐の両方
- Spec / Plan と実装がずれたら、実装を Spec に合わせるか、ずれをユーザーに報告して止める

### 禁止

- Spec / Plan / tasks に無い機能、リファクタ、依存追加
- 第 9 節の禁止ファイルの編集
- コミット（`AGENTS.md`: 勝手に実行しない。承認を取る）
- `sam deploy`、AWS コンソール相当の破壊的操作、本番テーブルの手動書き換え
- `frontend/.env` / `.env.production` の作成・編集・中身の引用
- FastAPI への CORS 追加、認証、検索、カテゴリ、未実装の画像機能（複数枚・リサイズ・サムネイル等）、ソフト削除、一覧削除
- 既存の `imageUrl` / 署名 URL / `GET /api/config` を壊す変更
- `api_gateway_base_path="prod"` や HTTP API の `/api/recipes` マッピングを、理由なく変える
- 一覧 Scan を Query + GSI に置き換えるなど、データモデル変更を独断で行う
- フロントから `fetch` をページに直書きする
- UI を別デザインシステムに置き換える
- メモスタック名・テーブル `Memos`・`MEMOS_TABLE`・`/api/memos` を復活させる
- 失敗した Language Server を無視して `replace_symbol_body` 等に頼る。LS が error のときは `search_for_pattern` と Cursor 読み取りで位置を確定し、許可されたテキスト編集だけを使う

Build 後は、変更した画面と API を成功条件に沿って確認する手順をユーザーに残す。本番反映は人間の作業である。

---

## 7. テスト方針

足場として pytest（メモリモード）と Playwright 受け入れテストがある。Build でテスト基盤を勝手に拡充しない。

### 既存の検証手段（正）

1. バックエンド: `backend` で Uvicorn（既定 `127.0.0.1:8000`）。`RECIPES_TABLE` 無しのためメモリ保存。再起動で消える
2. バックエンド単体: `backend` で pytest（`requirements-dev.txt`）。本番 DynamoDB は叩かない
3. フロント: 先に backend を 8000 で起動し、`frontend` で `npm run dev`（`127.0.0.1:5173`）
4. 手動シナリオ: 追加（材料行含む、ローカルはファイル選択なし）→ 一覧（カードに材料なし、`imageUrl` 空なら画像なし）→ 詳細（材料と分量）→ 編集（ローカルはファイル選択なし）→ お気に入り切替 → 削除。フロント再読み込み後も、backend 生存中は残る
5. フロント品質ゲート: `package.json` の `build` は `tsc --noEmit && vite build`。本番ビルドには `VITE_API_URL` が必要
6. 本番: CloudFront 再読み込み後に DynamoDB 上のデータが残ること（人間が確認。未デプロイなら対象外）

### コードを変えたときに最低限見る観点

- GET 一覧が `createdAt` 降順
- POST の空タイトル / 空白タイトルが 422、成功が 201
- 存在しない id の GET / PATCH / DELETE が 404
- DELETE 成功が 204
- JSON キーは `favorite` であり `done` ではない。`ingredients` は `name` / `amount` の文字列配列（省略 POST は `[]`、欠落 GET は `[]`、PATCH 省略は据え置き）。`imageUrl` は文字列（省略 POST は `""`、欠落 GET は `""`、PATCH 省略は据え置き）。メモリモードで `GET /api/config` は `imageUploadEnabled: false`、署名 URL は 501
- メモリ分岐と DynamoDB 分岐の両方で同じ JSON 形（`_from_item`）
- フロントの二重送信防止と削除 `confirm` が残っている
- 未知 URL が Unknown 画面のまま

### 自動テストを広げる場合（ユーザーが明示したときだけ）

- バックエンド: `backend` 配下に置き、FastAPI の TestClient でメモリモード（`RECIPES_TABLE` 無し）を先に固める。本番 DynamoDB をテストから叩かない
- フロント: 導入するなら既存 Vite / Playwright 構成に載せる。E2E は必須にしない
- テスト追加が Plan に無い Build では、テストファイルを増やさない

---

## 8. レビュー観点

実装・差分を見るときは次を欠かさない。

1. **スコープ**: README の「やらないこと」と AGENTS.md に反していないか
2. **契約**: パス、メソッド、ステータス、JSON キー（`createdAt`、`favorite`、`ingredients`、`imageUrl` 等 camelCase）が維持されているか。材料＋画像の正は `openspec/specs/recipe-board/spec.md`
3. **タイトル**: サーバ `strip` + フロント trim。空白のみを保存していないか
4. **ストア分岐**: `_use_memory()` の両経路を同じ意味で更新しているか。片方だけ直していないか
5. **Lambda / プレフィックス**: `handler`、`lifespan=off`、`api_gateway_base_path="prod"`。404 時は prefix を疑う（README）
6. **CORS**: FastAPI 側に足していないか。本番は API Gateway、ローカルはプロキシのままか
7. **フロント API**: すべて `api.ts` 経由か。`VITE_API_URL` に `RecipesEndpoint` やメモの API URL を使っていないか。末尾スラッシュを二重にしていないか
8. **UX**: 読み込み中、空一覧、二重投稿防止、星の連打防止、削除 confirm、未知 URL、詳細のエラー残留
9. **セキュリティ / データ**: 認証を足していないか（公開ボードのまま）。個人情報・秘密情報をコミット対象に含めていないか
10. **インフラ**: `template.yaml` を変えた場合、HttpApi イベントパス、DynamoDB PK、フロント CloudFront の 403/404 → `index.html`、画像用バケットと別 CloudFront が残っているか。ユーザー画像をフロント配信用バケットに置いていないか。スタック名がメモと別か。Serena はデプロイしない
11. **依存**: `requirements.txt` / `package.json` の追加が Plan にあるか。不要なライブラリが無いか
12. **git**: コミットしていないか。`.env.production`、`dist/`、`.venv/`、`.aws-sam/` が差分に混ざっていないか
13. **文書**: 契約を変えたなら `README.md` の表と成功条件が追いついているか。`AGENTS.md` は触っていないか

---

## 9. Serena が編集してよいファイル範囲・編集してはいけないファイル範囲

### 編集してよい（Build、またはユーザーが明示した Spec/Plan 成果物）

| 範囲 | 条件 |
|------|------|
| `frontend/src/**` | 画面・API クライアント・スタイル。既存のページ分割を維持 |
| `frontend/index.html` | タイトル等、アプリ表示に必要な最小限 |
| `backend/main.py` | ルートと store。単一ファイル前提を維持 |
| `backend/tests/**` | 既存契約のテスト。Plan にあるとき |
| `openspec/changes/**` | OpenSpec の企画成果物。propose / update のとき |
| `README.md` | 契約や起動手順が実装と変わったとき。ユーザーが文書更新を求めているとき |

### ユーザーの明示があるときだけ編集してよい

| 範囲 | 理由 |
|------|------|
| `template.yaml` | 本番 AWS リソースの正。パスや CORS、テーブルを壊すと本番が落ちる |
| `backend/requirements.txt`、`requirements-dev.txt` | 実行環境と Lambda パッケージに直結 |
| `frontend/package.json`、`package-lock.json` | 依存と Node 要件 |
| `frontend/vite.config.ts`、`tsconfig.json` | プロキシと本番 `VITE_API_URL` ゲート |
| `frontend/.env.example` | リポジトリに含める説明用。本番値は書かない |
| `backend/.samignore`、各 `.gitignore` | デプロイ成果物と秘密ファイルの除外 |
| 新規のテストファイル | 第 7 節。依頼があるときだけ |
| `docs/rules/project-rules-serena.md` | 本契約。人間の依頼があるときだけ |
| `openspec/config.yaml` | ワークフロー設定。人間の依頼があるときだけ |
| `openspec/specs/**` | 現行 capability の正（材料＋画像）。明示なしに編集しない |

### 編集してはいけない

| 範囲 | 理由 |
|------|------|
| `AGENTS.md` | 人間管理（AGENTS.md 自身の規定）。矛盾時は本ルールより AGENTS.md を優先 |
| `frontend/.env`、`frontend/.env.production`、`*.local` | 秘密・本番 API URL。git 対象外 |
| `frontend/dist/**`、`frontend/node_modules/**` | 生成物 |
| `backend/.venv/**`、`**/__pycache__/**` | ローカル環境 |
| `.aws-sam/**` | SAM ビルド成果 |
| `.git/**`、git 設定 | 破壊的操作と設定変更の禁止 |
| `.cursor/**` | 人間の IDE / MCP 設定 |
| `ai-demo1-checklist` リポジトリ | 別アプリ。残す前提。編集しない |
| リポジトリ外、AWS 上の実テーブル・バケット・ディストリビューション | Serena の編集対象外。デプロイは人間 |

### git とデプロイ

- コミットは勝手に実行しない。必ず承認を取る（`AGENTS.md`）
- push、force push、amend、hooks スキップはユーザー規則に従い、依頼が無ければ行わない
- `sam build` / `sam deploy`、S3 同期、CloudFront 無効化は人間の作業。Serena は手順を README に沿って説明してよいが、実行しない
- デプロイ時のスタック名は `ai-demo2-recipes`。メモスタックを指定しない

### Serena メモリ

- アーキテクチャの要約はメモリに書いてよい
- 本番の秘密、アカウント、`.env.production` の値、メモ側の本番 URL は書かない
- メモリより本ルールと `AGENTS.md` と `README.md` と `openspec/specs/recipe-board/spec.md` を優先する。レシピの画面・API・JSON（材料＋画像）は spec が正
