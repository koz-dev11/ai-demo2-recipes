## Why

現行のレシピボードはタイトル・本文・お気に入り星までで、材料と分量をレシピ内に持てない。手順はこれまでどおり `body` のままにし、認証・検索・カテゴリ・画像・ログインは足さずに、材料行だけを配列として足す。

## What Changes

- レシピ JSON に `ingredients`（`[{ "name": string, "amount": string }, ...]`）を足す。`name` も `amount` も人が読む文字列であり、数値換算や単位マスタは作らない
- 配列は空でもよい。保存時は各行の `name` / `amount` を strip し、両方空の行は捨てる。片方だけ空なら 422
- POST で `ingredients` を省略したら `[]`。GET は常に配列を返す（属性が無い古い想定は `[]`）
- PATCH で `ingredients` を更新できる（他項目と同様の部分更新）
- `/new` と詳細の編集で材料行の追加・削除・編集。詳細の閲覧で材料と分量の一覧。一覧カードには出さない
- 既存のタイトル必須、星、作成日時、削除 confirm、`body` の名前、1 テーブル・PK `id` は維持する
- `recipe-board` の「後続機能を出さない」要求から材料リストだけ外す（検索・カテゴリ・画像・ログインなどは MUST NOT のまま）
- `README.md` の「やらないこと」から材料リストを外し、画面 / API / 項目の表を追いつける
- apply の確認はローカルのみ（pytest、必要なら画面）。`sam build` / `sam deploy`、S3、CloudFront、commit / push はしない

## Capabilities

### New Capabilities

- （なし）

### Modified Capabilities

- `recipe-board`: レコード項目に `ingredients` を足し、新規・詳細で行の追加・削除・編集、PATCH で更新できるようにする。「Baseline excludes later features」から材料リストだけ外す

## Impact

- 企画: `openspec/changes/add-recipe-ingredients/` と、apply 時に main spec `openspec/specs/recipe-board/spec.md` へ delta を反映する前提
- コード: `backend/main.py`（Pydantic と store）、`backend/tests/`、`frontend/src/api.ts`、`NewPage.tsx`、`DetailPage.tsx`。一覧 `ListPage.tsx` に材料は出さない。`template.yaml` のテーブル・PK は変えない（ネスト属性として既存アイテムに載せる）
- ドキュメント: `README.md` のやらないこと、画面 / API、項目、進捗。`AGENTS.md` は編集しない
- 依存関係の追加、メモアプリ（`ai-demo1-checklist`）の資源、認証・検索・カテゴリ・画像・ログインは対象外
- apply では `sam deploy` / commit / push を行わない
