## Context

動機は `proposal.md` の Why。画面契約の変更は `specs/recipe-board/spec.md` の MODIFIED Requirements。

現状の 3 画面は `index.css` の `:root` がミント系（`--bg` / `--accent` / `--ink` など）。詳細閲覧は本文が材料より上で、本文に見出しは無い。詳細編集と `/new` は「本文（任意）」が材料より上。JSON は `body`。星は `--star` の金。`.ingredient-view` は `.ingredient-rows` と同じ `gap: 0.5rem`。ローカル 5173 では `imageUploadEnabled` が false のためファイル選択は出ない。apply の確認はローカルのみ。

## Goals / Non-Goals

**Goals:**

- 詳細・新規のブロック順を材料が本文（手順）より上にする
- 閲覧・編集・新規のラベルを「手順」で揃える。JSON は `body` のまま
- `:root` 変数だけで 3 画面を暖色（乳白背景＋テラコッタ／柔らかいオレンジ）にする。星の金は残す
- 詳細閲覧の `.ingredient-view` だけ行間を少し狭くする

**Non-Goals:**

- `body` を `steps` に改名すること、API / pytest / `template.yaml` の変更
- 検索、カテゴリ、ログイン、複数枚、リサイズ、サムネイル
- FastAPI CORS、画像 CORS / S3 の再設計、`sam deploy`、本番フロント載せ直し、git commit
- コンポーネントライブラリ、編集行グリッドの大きな変更、`letter-spacing` の変更

## Decisions

### CSS 変数は `:root` だけ暖色に付け替える

- 方針: `--bg` を乳白、`--accent` / `--accent-hover` をテラコッタ〜柔らかいオレンジ、`--ink` / `--muted` / `--line` / `--shadow` を暖色に合わせて読みやすくする。`--star` は現行の金を維持し、アクセントと十分差をつける。`--danger` は赤系のままコントラストを保つ
- hex は spec に固定しない。apply でコントラストが読める値を選ぶ
- 代替: 画面ごとに別パレット → 3 画面の一貫性が落ちるので採用しない。コンポーネントライブラリ → 対象外

### 詳細・新規のブロック順

- 詳細閲覧: タイトル・画像（あれば）・作成日時・星のあと、材料ブロック、その下に見出し「手順」と本文（空なら「（本文なし）」）。編集・削除は末尾のまま
- 詳細編集: タイトル必須 → 材料 → 手順（任意）→ 画像ファイル選択（有効時）→ 保存／キャンセル
- `/new`: タイトル必須 → 材料 → 手順（任意）→ 画像ファイル選択（有効時、今の材料の後側）→ 追加
- `.ingredient-view` の `gap` と `line-height` を少し下げる。`.ingredient-rows` のグリッドは大きく変えない

### JSON の `body` は維持する

- 画面ラベルだけ「手順」にする。API・DynamoDB・既存データと互換を保つ。`steps` への改名は対象外

### 確認はローカル 5173。deploy / commit は tasks に入れない

- Playwright MCP で一覧・新規・詳細の色と順、「手順」見出し／ラベル、材料が本文より上、を見る。ファイル選択は出ない前提
- pytest / backend / `template.yaml` は触らない

## Risks / Trade-offs

- [暖色のコントラスト不足] → `:root` の `--ink` と `--bg` / `--accent` の差を確保し、5173 で 3 画面を目視する。星の金とアクセントが近い場合はアクセント側をずらす
- [編集と閲覧のラベル不一致] → 今回は両方「手順」に揃える（閲覧は見出し、編集・新規は「手順（任意）」）
- [ローカルでは画像ファイル選択が出ない] → 仕様どおり。画像ブロックの位置はコード順で確認し、本番 PUT は今回の確認対象外

## Migration Plan

apply はフロント 3 ファイルのみ。ロールバックは当該差分の差し戻し。本番反映と commit はしない。
