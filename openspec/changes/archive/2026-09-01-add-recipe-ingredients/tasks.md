## 1. API と保存

- [x] 1.1 `backend/main.py` のレシピ JSON に `ingredients`（`[{ "name": string, "amount": string }, ...]`）を足し、POST 省略時は `[]`、GET は常に配列（属性無しは `[]`）であることを、コードと POST / GET 応答で確認する
- [x] 1.2 保存前に各行の `name` / `amount` を strip し、両方空の行は捨て、片方だけ空は 422 でストアに書かないことを、正規化処理と POST / PATCH で確認する
- [x] 1.3 PATCH `/api/recipes/{id}` が `ingredients` を更新でき、キー省略時は既存配列を維持し、`createdAt` が変わらないことを GET で確認する
- [x] 1.4 メモリ dict と DynamoDB store の両方が同一アイテムのネスト属性として `ingredients` を読み書きし、PK が `id` のまま、`template.yaml` に新規リソースが無いことをコードと diff で確認する

## 2. pytest

- [x] 2.1 材料付き POST、省略 POST（`ingredients: []`）、空配列、空白のみ行の削除、片方空の 422（作成も更新もされない）を `backend/tests/` に足し、`.\.venv\Scripts\python.exe -m pytest` で通ることを確認する
- [x] 2.2 PATCH で `ingredients` 更新・省略据え置き、GET の欠落 `[]`、既存のタイトル 422 / 星 / 削除 204 が壊れていないことを pytest 全件成功で確認する

## 3. 画面

- [x] 3.1 `frontend/src/api.ts` の `Recipe` / 作成・PATCH 型に `ingredients` を足し、create / get / patch が配列を送受信することを型と呼び出しで確認する
- [x] 3.2 `/new` で材料行の追加・削除・編集ができ、材料ゼロでも追加でき、成功後に一覧へ戻ることを `NewPage.tsx` と画面操作で確認する
- [x] 3.3 `/recipes/:id` の閲覧で材料と分量の一覧（空なら材料なしと分かる表示）、編集で行の追加・削除・編集・保存ができることを `DetailPage.tsx` と画面操作で確認する
- [x] 3.4 一覧カードに材料が出ず、タイトル必須・星・作成日時・削除 confirm が維持されることを `ListPage.tsx` / 詳細と画面で確認する
- [x] 3.5 片方空の行を保存しようとしたとき 422 が分かり、黙って行を捨てないことを新規または詳細の編集で確認する

## 4. README

- [x] 4.1 `README.md` の「やらないこと」と未着手から材料リストを外し、検索・カテゴリ・画像・ログインは残すことを当該段落で確認する
- [x] 4.2 画面表（`/new` と詳細に材料）、API 表（PATCH に `ingredients`）、項目（`ingredients` 配列）を追いつけることを当該表で確認する

## 5. 対象外の確認

- [x] 5.1 検索・カテゴリ・画像・ログインの導線や API が無く、`body` が `steps` に改名されていないことを3画面と `/api/recipes` で確認する
- [x] 5.2 `sam build` / `sam deploy`、S3、CloudFront、git commit / push、`AGENTS.md` 編集、メモアプリの編集を行っていないことを作業ログと git status で確認する
