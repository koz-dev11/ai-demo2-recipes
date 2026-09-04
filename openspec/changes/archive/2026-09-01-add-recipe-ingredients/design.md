## Context

動機は `proposal.md` の Why。振る舞いの契約は `specs/recipe-board/spec.md`。

現状のレシピは `id` / `title` / `body` / `favorite` / `createdAt`。画面は `/`・`/new`・`/recipes/:id`。API は FastAPI 単一ファイル `backend/main.py`、フロントは `api.ts` 経由。保存先は `RECIPES_TABLE` 未設定または `AWS_SAM_LOCAL` ならメモリ dict、それ以外は DynamoDB（PK `id`、Scan）。本番は未デプロイ。apply の確認はローカルのみ。

## Goals / Non-Goals

**Goals:**

- 同一レシピアイテムに `ingredients` 配列を載せ、POST / GET / PATCH と新規・詳細画面から読み書きできるようにする
- 正規化（strip、両方空の行は捨てる、片方だけ空は 422）を API 側で一箇所にする
- 既存の層（画面 → `api.ts` → `/api/recipes` → store）と 1 テーブル・PK `id` を維持する
- `README.md` のやらないこと・画面 / API / 項目をこの change に追いつける

**Non-Goals:**

- 検索、カテゴリ、画像、ログイン、単位マスタ、分量の数値換算、材料の別テーブル / GSI
- `body` の `steps` への改名、一覧カードへの材料表示
- `backend/main.py` の分割、状態管理ライブラリ、コンポーネントライブラリ
- `sam build` / `sam deploy`、S3、CloudFront、`template.yaml` への新規リソース、git commit / push
- メモアプリ（`ai-demo1-checklist`）の編集

## Decisions

### 1. 同一アイテムのネスト配列

- 決定: `ingredients` はレシピ JSON の配列。DynamoDB では同じアイテムのネスト属性。テーブル追加も PK 変更もしない
- 理由: 材料は 1 レシピに閉じ、件数は少ない。Scan とメモリ dict の既存経路で足りる
- 代替: 材料専用テーブルや PK `id` + SK → 読み書きと一覧が複雑になり、この change の範囲を超える

### 2. 型は人が読む文字列だけ

- 決定: 各行は `{ "name": string, "amount": string }`。単位コードや数値フィールドは持たない
- 理由: 「大さじ1」のような表記をそのまま残す。換算は後続の話
- 代替: `amount` を number + unit enum → 入力の自由度が落ち、マスタが要る

### 3. 正規化と 422 は API（Pydantic / ルート）で行う

- 決定: 保存前に各行の `name` / `amount` を strip。両方空なら行を捨てる。片方だけ空なら 422 でストアに書かない。空配列は許可。順序は入力順。重複名は許可（一意制約なし）
- 理由: 画面と直接 API 呼び出しで同じ契約になる。バリデーションを store に散らさない
- 代替: フロントだけ trim → API 直呼びで壊れる。片方空を黙って捨てる → 分量だけ入力した行が消えて気づかない

### 4. GET の欠落は `[]`、PATCH 省略は据え置き

- 決定: 応答組み立てで `ingredients` が無ければ `[]`。POST 省略も `[]`。PATCH でキー無しは既存配列を維持。`[]` を送ったときだけ空にする
- 理由: 部分更新の既存契約（`title` / `body` / `favorite`）と同じ。未デプロイでもメモリ上の古い形を想定できる
- 代替: PATCH 省略を空扱いにする → 星だけ切替で材料が消える

### 5. 画面は新規と詳細だけ。一覧は出さない

- 決定: `/new` と詳細編集で行の追加・削除・編集。詳細閲覧で一覧表示。`ListPage` のカードには出さない。共有コンポーネントは必須にしない（両ページで同じ行 UI でよい）
- 理由: 一覧は星・タイトル・作成日時のまま。材料は詳細で読む
- 代替: カードに先頭数行を出す → 一覧が長くなり、今回の「出さない」と衝突する

### 6. インフラと適用範囲

- 決定: `template.yaml` は触らない。pytest（メモリモード）を必須確認とする。画面確認は新規・詳細の材料操作が必要なら行う。Playwright は必須ゲートにしない
- 理由: ネスト属性は既存テーブル定義のままで足りる。本番未デプロイなので DynamoDB 実書きは検証しない
- 代替: この change で `sam deploy` → 禁止事項

## Risks / Trade-offs

- [Risk] 片方空の行を UI が送ると 422 → 新規・詳細で分かりやすい表示にする。黙って捨てない
- [Risk] 材料が多いとアイテムサイズが増える → 練習用の件数前提。別テーブルは後続
- [Risk] 認証なしのため誰でも材料を書き換えられる → 公開ボードの既存前提。この change ではログインを足さない
- [Trade-off] 文字列の分量は検索・合計に使えない → 換算しない方針との交換

## Migration Plan

データ移行ジョブは無い。既存アイテムに `ingredients` が無くても GET が `[]` を返す。本番は未デプロイのため、apply ではメモリ dict 上で確認する。

apply 時:

1. API モデルと正規化、pytest を先に通す
2. `api.ts` と新規・詳細画面を追いつける
3. `README.md` のやらないこと・表・進捗を更新する
4. `sam deploy` / commit はしない。rollback は git で戻す（この change では commit しない）

## Open Questions

なし。PATCH 省略は据え置き、行順は保持、重複名は許可、と決めた。
