## Why

現行のレシピボードはミント系の見た目で、詳細・新規では本文が材料より先に出る。料理の材料を先に読み、画面全体を暖色に揃えたい。API・JSON・画像アップロードの契約はそのままにする。

## What Changes

- 詳細の閲覧で、材料ブロックを本文より上に出す。本文の見出しは「手順」。空なら見出しの下に「（本文なし）」
- 詳細の編集と `/new` で、材料欄を本文より上に出す。本文のラベルは「手順（任意）」。JSON キーは `body` のまま
- `/new` はタイトル必須を先頭のまま。画像ファイル選択は材料の後（アップロード有効時のみ）
- 詳細閲覧の材料リスト（`.ingredient-view`）の行間を少し狭くする。`letter-spacing` は変えない
- 3 画面の色を暖色にする。乳白背景＋テラコッタ／柔らかいオレンジのアクセント。`index.css` の `:root` 変数だけ。星の金は維持し、アクセントと衝突させない
- コンポーネントライブラリは入れない。検索・カテゴリ・ログイン・複数枚・リサイズ・サムネイルは対象外
- apply の確認はローカル `127.0.0.1:5173`。`sam deploy` / 本番フロント載せ直し / commit はしない

## Capabilities

### New Capabilities

- （なし）

### Modified Capabilities

- `recipe-board`: 詳細・新規の読み順を材料が本文より上にし、本文の見出し／ラベルを「手順」にする。提供する情報（本文・材料・画像・星・削除）と JSON の `body` は維持する

## Impact

- 企画: `openspec/changes/restyle-recipe-board-warm-layout/` と、apply 時に main spec `openspec/specs/recipe-board/spec.md` へ delta を反映する前提
- コード: `frontend/src/pages/DetailPage.tsx`、`frontend/src/pages/NewPage.tsx`、`frontend/src/index.css` のみ
- API / JSON / `backend/` / `template.yaml` / 画像 CORS / S3 は変えない
- ドキュメント: apply では README を触らない（今回の企画は画面順と色）。`AGENTS.md` は編集しない
- apply では `sam build` / `sam deploy` / commit / push を行わない。確認はローカル 5173（ファイル選択は出ない）
