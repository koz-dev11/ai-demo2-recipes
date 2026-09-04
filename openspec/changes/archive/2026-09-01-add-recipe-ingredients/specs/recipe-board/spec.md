## MODIFIED Requirements

### Requirement: Recipe record uses id, title, body, favorite, createdAt
システムは各レシピを JSON の camelCase で表し、項目は `id`（UUID）、`title`、`body`、`favorite`、`createdAt`、`ingredients` で MUST である。`ingredients` は `[{ "name": string, "amount": string }, ...]` で MUST であり、`name` も `amount` も人が読む文字列で MUST である。`body` はメモ由来の本文のまま MUST であり、`steps` に改名しては MUST NOT である。完了フラグ `done` は使っては MUST NOT である。数値換算や単位マスタは提供しては MUST NOT である。

#### Scenario: Created recipe returns the five fields
- **WHEN** クライアントがタイトルと任意の本文でレシピを追加する
- **THEN** 応答は `id`、`title`、`body`、`favorite`、`createdAt`、`ingredients` を含む
- **AND** `favorite` の初期値は `false` である
- **AND** `ingredients` を省略した場合の初期値は空配列 `[]` である
- **AND** 項目名は `body` のままである

#### Scenario: Body is not renamed
- **WHEN** レシピの本文を読み書きする
- **THEN** フィールド名は `body` である
- **AND** `steps` という項目は存在しない

#### Scenario: Ingredients are human-readable strings
- **WHEN** クライアントが `ingredients` に `{ "name": "砂糖", "amount": "大さじ1" }` を含めて追加する
- **THEN** 応答の当該行は同じ文字列の `name` と `amount` である
- **AND** 数値や単位コードへの変換は行われない

### Requirement: List screen at /
システムは画面 `/` でレシピ一覧を MUST で出す。各カードはお気に入り星、タイトル、作成日時を MUST で示し、カード操作で詳細 `/recipes/:id` へ MUST で遷移する。一覧からレシピを削除する操作は MUST NOT である。一覧カードに材料は出しては MUST NOT である。

#### Scenario: Empty list
- **WHEN** レシピがまだ無い状態で `/` を開く
- **THEN** 空であることが分かる
- **AND** 追加画面への導線がある

#### Scenario: Card shows star, title, and created time
- **WHEN** レシピが1件以上ある状態で `/` を開く
- **THEN** 各カードにお気に入り星、タイトル、作成日時が出る
- **AND** カードからそのレシピの詳細へ遷移できる

#### Scenario: List has no delete control
- **WHEN** 利用者が `/` を見る
- **THEN** 一覧上に削除操作はない

#### Scenario: List card does not show ingredients
- **WHEN** 材料があるレシピが一覧にある状態で `/` を開く
- **THEN** カードに材料名や分量は出ない

### Requirement: New screen at /new
システムは画面 `/new` で新規追加を MUST で提供する。タイトルは必須、本文は任意で MUST である。材料行の追加・削除・編集を MUST で提供する。材料ゼロでも追加できて MUST である。追加に成功したら一覧 `/` へ MUST で戻る。

#### Scenario: Title is required
- **WHEN** 利用者がタイトル空のまま `/new` で追加しようとする
- **THEN** レシピは追加されない
- **AND** タイトル必須であることが分かる

#### Scenario: Successful create returns to list
- **WHEN** 利用者が必須のタイトルと任意の本文で追加する
- **THEN** 一覧 `/` に戻り、そのレシピが一覧に出る

#### Scenario: Ingredient rows can be added and removed
- **WHEN** 利用者が `/new` で材料行を追加し、名前と分量を入力してから行を削除する
- **THEN** 削除した行はフォームから消える
- **AND** 残した行は追加後の詳細で材料一覧に出る

#### Scenario: Create with no ingredients is allowed
- **WHEN** 利用者がタイトルだけ入力し、材料行を空のまま `/new` で追加する
- **THEN** レシピは追加される
- **AND** 詳細の材料は空であることが分かる

### Requirement: Detail screen at /recipes/:id
システムは画面 `/recipes/:id` で詳細を MUST で出す。閲覧モードでは本文、作成日時、お気に入り星、材料と分量の一覧、編集、削除を MUST で提供する。編集モードでは材料行の追加・削除・編集を MUST で提供する。削除は閲覧モードで確認後のハード削除で MUST であり、成功したら一覧へ MUST で戻る。存在しない id では詳細本文や作成日時を出しては MUST NOT である。

#### Scenario: View shows body, created time, favorite, edit, and delete
- **WHEN** 存在するレシピの `/recipes/:id` を閲覧モードで開く
- **THEN** タイトル、本文（無ければ本文なしであることが分かる表示）、作成日時、お気に入り星、材料と分量の一覧（無ければ材料なしであることが分かる表示）、編集、削除が出る

#### Scenario: Created time matches list and hides while editing
- **WHEN** 利用者が一覧の作成日時と同じレシピの詳細を開く
- **THEN** 詳細の作成日時は一覧と一致する
- **AND** 編集中は作成日時を出さない
- **AND** 保存後も作成日時は変わらない

#### Scenario: Edit updates ingredient rows
- **WHEN** 利用者が詳細の編集で材料行を追加・削除・編集して保存する
- **THEN** 閲覧モードの材料一覧は保存した内容になる
- **AND** 一覧カードには材料は出ない

#### Scenario: Delete requires confirm then returns to list
- **WHEN** 利用者が詳細の閲覧モードで削除し、確認する
- **THEN** そのレシピは削除される
- **AND** 一覧 `/` に戻る
- **AND** 一覧にそのレシピは出ない

#### Scenario: Missing recipe
- **WHEN** 存在しない id の `/recipes/:id` を開く
- **THEN** 見つからないことが分かる
- **AND** 作成日時は出ない

### Requirement: Recipes API at /api/recipes
システムは `/api/recipes` で次の契約を MUST で提供する。一覧 GET、追加 POST、詳細 GET `/api/recipes/{id}`、部分更新 PATCH `/api/recipes/{id}`（`title` / `body` / `favorite` / `ingredients`）、ハード削除 DELETE `/api/recipes/{id}`（成功 204、無し 404）。一覧は `createdAt` の降順で MUST である。PATCH は `createdAt` を変えては MUST NOT である。存在しない id の GET / PATCH / DELETE は 404 で MUST である。GET（一覧・詳細）は常に `ingredients` 配列を MUST で返す。属性が無い古い想定では `[]` で MUST である。POST で `ingredients` を省略したら `[]` で MUST である。PATCH で `ingredients` を省略したら既存の材料は変えては MUST NOT である。

#### Scenario: Create then list and get
- **WHEN** クライアントが POST `/api/recipes` で追加する
- **THEN** 応答は 201 で、そのレシピを含む
- **AND** GET `/api/recipes` に `createdAt` 降順で含まれる
- **AND** GET `/api/recipes/{id}` は 200 で同じ `createdAt` を返す
- **AND** 各 GET のレシピは `ingredients` 配列を含む

#### Scenario: Create omits ingredients
- **WHEN** クライアントが `ingredients` 無しで POST `/api/recipes` する
- **THEN** 応答の `ingredients` は `[]` である
- **AND** その後の GET も `ingredients` は `[]` である

#### Scenario: Patch updates fields without changing createdAt
- **WHEN** クライアントが PATCH `/api/recipes/{id}` で `title`、`body`、`favorite`、`ingredients` を順に部分更新する
- **THEN** 各更新後の GET は指定した項目だけ変わり、`createdAt` は作成時のままである

#### Scenario: Patch omits ingredients
- **WHEN** 材料があるレシピに対し、クライアントが `ingredients` を含めずに PATCH する
- **THEN** 既存の `ingredients` は変わらない

#### Scenario: Get fills missing ingredients
- **WHEN** `ingredients` 属性が無いレシピ相当を GET する
- **THEN** 応答の `ingredients` は `[]` である

#### Scenario: Missing id returns 404
- **WHEN** 存在しない id に GET、PATCH、または DELETE する
- **THEN** 応答は 404 である
- **AND** GET のエラー本体に `createdAt` は含まれない

#### Scenario: Delete is hard delete
- **WHEN** クライアントが存在する id を DELETE `/api/recipes/{id}` する
- **THEN** 応答は 204 である
- **AND** その後の GET はその id で 404 である

### Requirement: Persistence is memory locally and DynamoDB in production
`RECIPES_TABLE` が未設定のローカルでは、保存先はプロセス内のメモリ dict で MUST である。フロントを再読み込みしても、backend プロセスが生きている間はデータは MUST で残る。backend 再起動後にメモリ上のデータが残ることは MUST NOT である。本番では DynamoDB テーブル（PK は `id`、一覧は Scan、想定名 `${AWS::StackName}-recipes`）に MUST で残り、CloudFront 配下の画面から読み書きできる。`ingredients` は同一アイテムのネスト属性で MUST であり、別テーブルにしては MUST NOT である。`AWS_SAM_LOCAL` が立っているときはメモリ dict で MUST である。

#### Scenario: Local reload keeps data while backend lives
- **WHEN** ローカルで `RECIPES_TABLE` 未設定のままレシピを追加し、フロントだけ再読み込みする
- **THEN** 追加したレシピは一覧に残る

#### Scenario: Production stores by id in DynamoDB
- **WHEN** 本番でレシピを追加・更新・削除する
- **THEN** データは DynamoDB（PK `id`）に反映される
- **AND** 一覧取得は Scan に基づく
- **AND** `ingredients` は同じアイテムのネスト属性として残る
- **AND** 再読み込み後もデータが残る

### Requirement: Baseline excludes later features
この capability の範囲では、検索、カテゴリ、画像アップロード、ログイン、管理者機能、モバイルアプリ、ソフト削除、一覧からの削除、タグ、添付、リアルタイム同期を提供しては MUST NOT である。

#### Scenario: Out-of-scope features are absent
- **WHEN** 利用者が現行の3画面と `/api/recipes` を使う
- **THEN** 検索、カテゴリ、画像アップロード、ログインの導線や API は無い
- **AND** 材料リストの閲覧と編集は提供されている

## ADDED Requirements

### Requirement: Ingredient rows are normalized and validated
`ingredients` の各行は保存前に `name` と `amount` を strip して MUST である。両方空の行は保存しては MUST NOT であり、配列から捨てて MUST である。strip 後に `name` だけ空で `amount` がある、またはその逆は 422 で MUST であり、そのリクエストではレシピを作っても更新しても MUST NOT である。空配列は許可して MUST である。行の順序は入力配列の順で MUST である。

#### Scenario: Empty array is stored
- **WHEN** クライアントが `ingredients` を `[]` で POST または PATCH する
- **THEN** 応答は成功である
- **AND** 保存された `ingredients` は `[]` である

#### Scenario: Blank-only rows are dropped
- **WHEN** クライアントが `name` と `amount` が両方空または空白のみの行を含む `ingredients` で POST する
- **THEN** 応答は成功である
- **AND** その行は保存された配列に含まれない

#### Scenario: Name without amount is rejected
- **WHEN** クライアントが strip 後に `name` だけ値があり `amount` が空の行を含む `ingredients` で POST または PATCH する
- **THEN** 応答は 422 である
- **AND** そのリクエストではレシピは作られず、既存レシピの材料も変わらない

#### Scenario: Amount without name is rejected
- **WHEN** クライアントが strip 後に `amount` だけ値があり `name` が空の行を含む `ingredients` で POST または PATCH する
- **THEN** 応答は 422 である
- **AND** そのリクエストではレシピは作られず、既存レシピの材料も変わらない
