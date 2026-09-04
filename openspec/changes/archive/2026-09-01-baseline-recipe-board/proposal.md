## Why

認証なしの公開レシピボードの足場（CRUD とボード全体のお気に入り星）はコード上すでに動いているが、OpenSpec の capability としては未登録である。今後の差分を書くための正本として、いまの成功条件・画面・API を `recipe-board` に載せる。

## What Changes

- 現行実装の振る舞いを新 capability `recipe-board` として仕様化する（新機能は足さない）
- 項目は `id`, `title`, `body`, `favorite`, `createdAt` のままとする（`body` を `steps` に改名しない）
- 画面は `/`、`/new`、`/recipes/:id`。API は `/api/recipes` の GET 一覧 / POST 追加 / GET 詳細 / PATCH / DELETE
- お気に入りは認証なしのボード全体の星。ローカルは `RECIPES_TABLE` 未設定ならメモリ dict、本番は DynamoDB（PK `id`、Scan）
- メモアプリ（`ai-demo1-checklist`）とはスタックも URL も共有しないことを仕様に明記する
- apply の対象は「現行実装が spec と一致するかの確認」と「不一致があれば最小修正」まで。材料リスト、検索、カテゴリ、画像アップロード、ログイン、`sam deploy`、git commit / push、アプリケーションコードと `template.yaml` の新規機能は対象外

## Capabilities

### New Capabilities

- `recipe-board`: 認証なし公開レシピボードの一覧・追加・詳細・編集・削除・ボード全体お気に入り。項目・画面・API・保存先の現行契約

### Modified Capabilities

- （なし。`openspec/specs/` に既存 capability はない）

## Impact

- 企画成果物: `openspec/changes/baseline-recipe-board/` の proposal / specs / design / tasks のみをこの change で追加する
- 実装の正: `README.md` の成功条件、画面 / API、やらないこと。コードは `frontend/`（`/` `/new` `/recipes/:id`）、`backend/main.py`（`/api/recipes`）、`template.yaml`（想定スタック `ai-demo2-recipes`）に既にある
- apply 時は既存コードとテストの照合が主。不一致がなければアプリケーションコードと `template.yaml` は触らない
- 依存関係の追加やメモアプリ資源（スタック、テーブル `Memos`、`MEMOS_TABLE`、`/api/memos`、そのアプリの URL）の利用はしない
- `AGENTS.md` は人間管理のため編集しない。commit / push / `sam deploy` は依頼があるまで行わない
