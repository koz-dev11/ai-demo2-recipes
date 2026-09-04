## 1. API と保存先の照合

- [x] 1.1 `backend/main.py` の JSON が `id`（UUID）、`title`、`body`、`favorite`、`createdAt` であり、`steps` と `done` が無いことをコードと POST 応答で確認する
- [x] 1.2 `/api/recipes` の GET 一覧（`createdAt` 降順）、POST 追加（201）、GET 詳細、PATCH（`title` / `body` / `favorite`、`createdAt` 不変）、DELETE（204 / 404）が揃っていることをルート定義と `backend/tests/test_recipes_api.py` で確認する
- [x] 1.3 空・空白のみタイトルの POST が 422 で保存されないことを pytest で確認する
- [x] 1.4 `RECIPES_TABLE` 未設定または `AWS_SAM_LOCAL` ならメモリ dict、それ以外は DynamoDB（PK `id`、Scan）であることを `_use_memory` と store 関数で確認する
- [x] 1.5 メモリモードで `backend` の pytest がすべて通ることをコマンド実行で確認する

## 2. 画面とフロント契約の照合

- [x] 2.1 ルートが `/`、`/new`、`/recipes/:id` のみ（未知パスは見つからない表示）であることを `App.tsx` で確認する
- [x] 2.2 一覧カードがお気に入り星・タイトル・作成日時を出し、カードで詳細へ行き、一覧に削除が無いことを `ListPage.tsx` で確認する
- [x] 2.3 `/new` がタイトル必須・本文任意で、成功後に `/` へ戻ることを `NewPage.tsx` で確認する
- [x] 2.4 詳細が閲覧（本文・作成日時・星・編集・削除）、編集中は作成日時なし、削除は confirm 後ハード削除で一覧へ戻ることを `DetailPage.tsx` で確認する
- [x] 2.5 お気に入りが認証なしのボード全体星で、一覧と詳細が同じ `favorite` を PATCH することを `api.ts` と両ページで確認する
- [x] 2.6 フロントが `/api/recipes` を呼び、ローカルは相対パス＋ Vite `/api` プロキシ、本番は `VITE_API_URL`＝このスタックの `ApiUrl` 想定であり、FastAPI に CORS ミドルウェアが無いことを `api.ts`・`vite.config.ts`・`main.py` で確認する

## 3. 分離と対象外の照合

- [x] 3.1 API が `/api/recipes`、環境変数が `RECIPES_TABLE`、テーブルが `${AWS::StackName}-recipes`、FunctionName が `${AWS::StackName}-recipes` であり、`/api/memos`・`MEMOS_TABLE`・`Memos` が無いことを `main.py` と `template.yaml` で確認する
- [x] 3.2 材料リスト、検索、カテゴリ、画像アップロード、ログインの画面・API が無いことを3画面と `/api/recipes` だけで確認する

## 4. 不一致時の最小修正

- [x] 4.1 1〜3 で不一致があれば、spec を満たす最小修正だけ行い、関連する pytest（必要なら該当する Playwright）が通ることを確認する。新機能は足さない
- [x] 4.2 不一致がなければアプリケーションコードと `template.yaml` を変更しないことを、当該パスの diff が空（または企画成果物以外）であることで確認する

## 5. この change でやらないこと

- [x] 5.1 `sam deploy`、git commit / push、`template.yaml` への新規リソースを行っていないことを作業ログと git status で確認する
