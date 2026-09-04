## Context

動機は `proposal.md` の Why。振る舞いの契約は `specs/recipe-board/spec.md`。

現状のレシピ JSON は `id` / `title` / `body` / `favorite` / `createdAt` / `ingredients`。画面は `/`・`/new`・`/recipes/:id`。API は FastAPI 単一ファイル `backend/main.py`、フロントは `api.ts` 経由。保存先は `RECIPES_TABLE` 未設定または `AWS_SAM_LOCAL` ならメモリ dict、それ以外は DynamoDB（PK `id`、Scan）。本番フロントは `FrontendBucket` + CloudFront（403/404 を `index.html` に落とす）。本番は未デプロイ。apply の確認はローカルのみ（pytest と Playwright MCP の `127.0.0.1:5173`）。

## Goals / Non-Goals

**Goals:**

- `imageUrl` を同一レシピアイテムの文字列属性として載せ、POST / GET / PATCH と一覧・詳細から参照できるようにする
- 本体は専用バケットへ置き、ブラウザが署名付き URL で S3 に PUT する。バイナリは Lambda / API Gateway / DynamoDB / フロント配信用バケットを通さない
- `_use_memory()` のときはアップロード UI と S3 を使わず、CRUD を維持する
- `template.yaml` に画像用バケットと配信・権限・API イベントを足す（apply ではデプロイしない）
- `README.md` のやらないこと・画面 / API / 項目・進捗をこの change に追いつける

**Non-Goals:**

- 検索、カテゴリ、ログイン、複数枚、リサイズ、サムネイル、画像の寿命管理（削除時の S3 掃除）
- FastAPI への CORS 追加、`backend/main.py` の分割、状態管理ライブラリ
- `sam build` / `sam deploy`、本番 S3 への実 PUT、git commit / push
- メモアプリ（`ai-demo1-checklist`）の編集、`AGENTS.md` の編集

## Decisions

### 1. 本体は専用バケット、参照だけを JSON に載せる

- 決定: `imageUrl` は string（空文字可）。DynamoDB は同一アイテムの属性。本体は `${AWS::StackName}-recipe-images-${AWS::AccountId}` 相当の専用バケット。`FrontendBucket` には置かない
- 理由: フロント配信バケットは `dist` と SPA フォールバック用。ユーザー画像を混ぜると無効化と 403/404 → `index.html` が衝突する
- 代替: フロントバケットに `images/` を置く → 依頼の禁止事項。DynamoDB にバイナリ → アイテムサイズと Scan が壊れる

### 2. 読み取りは画像用 CloudFront、書き込みは S3 署名付き PUT

- 決定: 画像バケットはフロントと同様にパブリックブロック + OAC。**別** CloudFront ディストリビューション（SPA の 403/404 書き換え無し）で GET する。PUT は boto3 の署名付き URL をブラウザが S3 オリジンへ直接送る。保存する `imageUrl` は `https://{ImagesDistribution}/{objectKey}`
- 理由: 既存フロントと同じ「バケット非公開 + CloudFront」に揃える。フロント配信 CF にオリジンを足すと、画像 404 が `index.html` になる
- 代替: バケットを GetObject 公開にする → リソースは少ないが、フロントと方針が割れる。GET も都度署名 → 一覧カードの URL がすぐ期限切れになる

### 3. オブジェクトキーはレシピ id + アップロード id

- 決定: キーは `recipes/{recipeId}/{uploadId}`。`uploadId` は UUID。差し替えは新しいキーで `imageUrl` を上書きする。旧オブジェクトの削除はこの change ではしない
- 理由: 同じキー上書きだと CloudFront キャッシュで古い画が残る。1 レシピ 1 参照は JSON 側で守る
- 代替: 固定キー `recipes/{id}/image` → 差し替え後も同じ URL になりキャッシュが残る

### 4. 新規は先にレシピを作り、その後 PUT して PATCH

- 決定: `/new` でファイルがあっても、先に POST `/api/recipes`（`imageUrl` 省略で `""`）、続けて署名 URL 取得 → S3 PUT → PATCH `imageUrl`。失敗したらレシピは残し、`imageUrl` は空のまま。詳細編集も保存時に同じ順（ファイルが無いときは既存 PATCH のみ）
- 理由: キーに `recipeId` が要る。バイナリを POST に載せない
- 代替: 先に匿名キーで PUT してから POST → 作られなかったレシピのゴミが増える

### 5. 署名 URL API と設定フラグ

- 決定:
  - `POST /api/recipes/{id}/image-upload-url` 本文 `{ "contentType": "image/jpeg" | "image/png" | "image/webp" }`。成功は `{ "uploadUrl", "imageUrl" }`。無い id は 404。許可外の Content-Type は 422。有効期限は 5 分
  - `GET /api/config` は `{ "imageUploadEnabled": boolean }`。`_use_memory()` が真、または `RECIPE_IMAGES_BUCKET` 未設定なら `false`
  - メモリモードで署名 URL を呼んだら 501
- 理由: フロントは `RECIPES_TABLE` を直接見ない。フラグでファイル選択の出し分けができる。Vite の `VITE_API_URL` 空だけを合図にすると、本番 API をローカルから叩くときにずれる
- 代替: フロント常時ファイル選択 → ローカルで S3 が無く壊れる。フラグ無しで 501 を見て隠す → 選択 UI が一瞬出る

### 6. ローカルは S3 を使わない

- 決定: `_use_memory()`（`RECIPES_TABLE` 未設定または `AWS_SAM_LOCAL`）では署名も PUT もしない。`imageUrl` は常に `""` でよい。新規・詳細は `imageUploadEnabled === false` のときファイル選択を出さない。pytest はメモリモードで JSON 契約と 501 / `imageUploadEnabled: false` を見る
- 理由: 依頼どおり。apply で S3 は使えない
- 代替: LocalStack → 範囲外

### 7. 許可するファイルとサイズ

- 決定: `image/jpeg`・`image/png`・`image/webp` のみ。フロントは `accept` と 5MB 超の拒否。サーバは署名発行時に Content-Type だけ見る。リサイズしない
- 理由: 料理写真の最小セット。サムネイルは対象外
- 代替: 任意 MIME → SVG 等を公開ボードに置くことになる

### 8. インフラと適用範囲

- 決定: `template.yaml` に画像バケット、OAC、画像用 CloudFront、バケット CORS（ブラウザ PUT 用、`AllowedOrigins: '*'`、`PUT` / `GET` / `HEAD`）、Lambda 環境変数 `RECIPE_IMAGES_BUCKET` と `RECIPE_IMAGES_PUBLIC_BASE`、`s3:PutObject`（署名に必要）、HttpApi イベント（`POST /api/recipes/{id}/image-upload-url`、`GET /api/config`）を足す。API Gateway の CORS は既存のまま。FastAPI に CORS を足さない。apply では `sam build` / `sam deploy` をしない。画面確認は Playwright MCP で `127.0.0.1:5173`（ファイル選択が出ないことと CRUD）
- 理由: 本番形はテンプレートに残すが、未デプロイのため実 PUT は検証しない
- 代替: この change で `sam deploy` → 禁止事項

### 9. PATCH の `imageUrl`

- 決定: 省略は据え置き。`""` を送ったら参照を空にする。GET で属性が無ければ `""`。材料と同じ部分更新
- 理由: 星だけ切替で画像が消えない
- 代替: 省略を空扱い → お気に入り PATCH で画像が消える

## Risks / Trade-offs

- [Risk] 差し替え・削除後に S3 上の旧オブジェクトが残る → この change では掃除しない。キーに uploadId を入れて参照は 1 件に保つ
- [Risk] 公開ボードのため署名 URL を誰でも取れる → 認証を足さない前提。Content-Type と 5MB で最低限抑える
- [Risk] 新規で POST 成功・PUT 失敗だと画像無しレシピが残る → 空の `imageUrl` のまま一覧に出し、編集で再選択できる
- [Risk] CloudFront の画像 URL と API のオリジンが違う → `<img src={imageUrl}>` は別オリジン GET でよい。S3 CORS は PUT 用
- [Trade-off] 画像用 CF をフロントと分ける → テンプレートは増えるが、SPA フォールバックと衝突しない
- [Trade-off] apply では本番アップロードを確認できない → ローカルは UI スキップと JSON 契約に限定する

## Migration Plan

データ移行ジョブは無い。既存アイテムに `imageUrl` が無くても GET が `""` を返す。本番は未デプロイのため、apply ではメモリ dict と 5173 の画面だけで確認する。

apply 時:

1. API の `imageUrl`・`/api/config`・署名 URL の 501、pytest を先に通す
2. `template.yaml` に画像用リソースを足す（デプロイはしない）
3. `api.ts` と一覧・新規・詳細を追いつける（ローカルはファイル選択なし）
4. Playwright MCP で `127.0.0.1:5173` の CRUD と、ファイル選択が出ないことを確認する
5. `README.md` を更新する
6. `sam build` / `sam deploy` / commit はしない。rollback は git で戻す（この change では commit しない）

## Open Questions

なし。キーは uploadId 付き、ローカルは `GET /api/config` で UI を隠す、画像用 CF はフロントと分ける、と決めた。
