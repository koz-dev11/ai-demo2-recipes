## 1. API と保存

- [x] 1.1 `backend/main.py` のレシピ JSON に `imageUrl`（string、空文字可）を足し、POST 省略時は `""`、GET は常に文字列（属性無しは `""`）、PATCH 省略は据え置き、`""` 送信はクリアであることを、コードと POST / GET / PATCH 応答で確認する
- [x] 1.2 メモリ dict と DynamoDB store の両方が同一アイテムの文字列属性として `imageUrl` を読み書きし、画像バイナリをストアに書いていないことをコードで確認する
- [x] 1.3 `GET /api/config` がメモリモードで `{ "imageUploadEnabled": false }` を返すことを応答で確認する
- [x] 1.4 `POST /api/recipes/{id}/image-upload-url` がメモリモードで 501、無い id は（有効時）404、許可外 Content-Type は（有効時）422 になることをコードとメモリモードの 501 応答で確認する。POST / PATCH のレシピ JSON にバイナリフィールドが無いことを型で確認する

## 2. pytest

- [x] 2.1 `imageUrl` 付き PATCH、省略 POST（`""`）、欠落 GET（`""`）、PATCH 省略据え置き、空文字クリア、既存の材料 / タイトル 422 / 星 / 削除 204 が壊れていないことを `backend/tests/` に足し、`.\.venv\Scripts\python.exe -m pytest` で通ることを確認する
- [x] 2.2 メモリモードで `GET /api/config` が `imageUploadEnabled: false`、署名 URL が 501 であることを pytest で確認する

## 3. template.yaml（デプロイしない）

- [x] 3.1 `template.yaml` に画像用バケット（フロント配信用とは別）、OAC、SPA フォールバック無しの画像用 CloudFront、バケット CORS（PUT / GET / HEAD）、Lambda の `RECIPE_IMAGES_BUCKET` / `RECIPE_IMAGES_PUBLIC_BASE`、`s3:PutObject`、HttpApi イベント（`POST /api/recipes/{id}/image-upload-url`、`GET /api/config`）を足し、`FrontendBucket` にユーザー画像用パスが無いことを diff で確認する
- [x] 3.2 この change で `sam build` / `sam deploy` を実行していないことを作業ログで確認する

## 4. 画面

- [x] 4.1 `frontend/src/api.ts` の型と create / get / patch に `imageUrl` を足し、`getConfig` と署名 URL 取得を `api.ts` 経由だけにしたことを型と呼び出しで確認する
- [x] 4.2 `ListPage.tsx` が `imageUrl` 非空のときカードに画像を出し、空なら出さない（材料は出さないまま）ことをコードで確認する
- [x] 4.3 `NewPage.tsx` / `DetailPage.tsx` が `imageUploadEnabled === false` のときファイル選択を出さず、true のときは 1 枚のファイル選択（jpeg / png / webp、複数枚・リサイズ無し）を出すことをコードで確認する
- [x] 4.4 アップロード有効時の順（POST レシピ → 署名 URL → S3 PUT → PATCH `imageUrl`。バイナリは `/api/recipes` に載せない）が新規・詳細編集のコードにあることを確認する

## 5. ローカル画面確認（Playwright MCP）

- [x] 5.1 backend を `127.0.0.1:8000`、front を `127.0.0.1:5173` で起動し、Playwright MCP で `/new` に画像ファイル選択が無いこと、タイトルだけで追加できること、一覧カードに画像が出ないことを確認する
- [x] 5.2 Playwright MCP で追加 → 一覧 → 詳細（画像なし）→ 編集（ファイル選択なし）→ お気に入り切替 → 削除が完了し、検索・カテゴリ・ログインの導線が無いことを `127.0.0.1:5173` で確認する

## 6. README

- [x] 6.1 `README.md` の「やらないこと」と未着手から画像アップロードを外し、検索・カテゴリ・ログインは残すことを当該段落で確認する
- [x] 6.2 画面表（一覧・詳細に画像、新規・編集のファイル選択）、API 表（PATCH に `imageUrl`、署名 URL と `/api/config`）、項目（`imageUrl` 文字列、空文字可、専用バケット）と進捗を追いつけることを当該箇所で確認する

## 7. 対象外の確認

- [x] 7.1 検索・カテゴリ・ログインの導線や API が無く、複数枚・サムネイルが無く、`AGENTS.md` とメモアプリを編集していないことを3画面と git status で確認する
- [x] 7.2 `sam build` / `sam deploy`、git commit / push を行っていないことを作業ログと git status で確認する
