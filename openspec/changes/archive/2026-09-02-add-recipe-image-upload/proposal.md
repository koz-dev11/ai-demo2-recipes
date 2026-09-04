## Why

現行のレシピボードは材料まで持てるが、料理の見た目を1枚も載せられない。認証・検索・カテゴリは足さずに、専用 S3 へ本体を置き、レシピ JSON には参照だけを足す。

## What Changes

- レシピ JSON に `imageUrl`（string、空文字可）を足す。DynamoDB にも同じ参照だけを載せ、画像バイナリは置かない
- 画像本体はフロント配信用バケット（`dist`）ではなく、`template.yaml` に足す専用 S3 バケットへ置く
- アップロードは署名付き URL。ブラウザが S3 に PUT する。バイナリを Lambda / API Gateway に流さない
- 一覧カードと詳細閲覧に画像が出る。新規・編集でファイル選択。画像は任意で、無しでもレシピを作れる
- 1 レシピあたり 1 枚まで。複数枚、リサイズ、サムネイルは対象外
- ローカル（`RECIPES_TABLE` 未設定）では S3 無し。`imageUrl` は空、アップロード UI はスキップし、既存 CRUD は維持する
- `recipe-board` の「Baseline excludes later features」から画像アップロードだけ外す（検索・カテゴリ・ログインなどは MUST NOT のまま）
- `README.md` の「やらないこと」・画面 / API / 項目・進捗を追いつける
- apply の確認はローカルのみ（pytest、Playwright MCP で `127.0.0.1:5173`）。`sam build` / `sam deploy`、commit / push はしない

## Capabilities

### New Capabilities

- （なし）

### Modified Capabilities

- `recipe-board`: レコード項目に `imageUrl` を足し、署名付き URL で専用 S3 へ 1 枚まで載せ、一覧・詳細で表示できるようにする。「Baseline excludes later features」から画像アップロードだけ外す

## Impact

- 企画: `openspec/changes/add-recipe-image-upload/` と、apply 時に main spec `openspec/specs/recipe-board/spec.md` へ delta を反映する前提
- コード: `backend/main.py`（JSON・署名 URL・store）、`backend/tests/`、`frontend/src/api.ts`、`ListPage.tsx`、`NewPage.tsx`、`DetailPage.tsx`
- インフラ定義: `template.yaml` に画像用バケット（と読み取り用の配信、Lambda の署名権限・環境変数、必要なら署名 URL 用の HttpApi イベント）。フロント配信用バケットにはユーザー画像を置かない
- ドキュメント: `README.md` のやらないこと、画面 / API、項目、進捗。`AGENTS.md` は編集しない
- メモアプリ（`ai-demo1-checklist`）の資源は使わない。ログイン・検索・カテゴリは対象外
- apply では `sam build` / `sam deploy` / commit / push を行わない。本番 S3 / CloudFront への実アップロードは検証しない
