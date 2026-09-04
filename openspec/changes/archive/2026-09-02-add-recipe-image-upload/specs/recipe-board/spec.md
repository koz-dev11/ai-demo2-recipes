## MODIFIED Requirements

### Requirement: Recipe record uses id, title, body, favorite, createdAt
システムは各レシピを JSON の camelCase で表し、項目は `id`（UUID）、`title`、`body`、`favorite`、`createdAt`、`ingredients`、`imageUrl` で MUST である。`ingredients` は `[{ "name": string, "amount": string }, ...]` で MUST であり、`name` も `amount` も人が読む文字列で MUST である。`imageUrl` は string で MUST であり、空文字を許可して MUST である。`imageUrl` は画像本体ではなく参照で MUST であり、レシピ JSON に画像バイナリを含めては MUST NOT である。`body` はメモ由来の本文のまま MUST であり、`steps` に改名しては MUST NOT である。完了フラグ `done` は使っては MUST NOT である。数値換算や単位マスタは提供しては MUST NOT である。

#### Scenario: Created recipe returns the five fields
- **WHEN** クライアントがタイトルと任意の本文でレシピを追加する
- **THEN** 応答は `id`、`title`、`body`、`favorite`、`createdAt`、`ingredients`、`imageUrl` を含む
- **AND** `favorite` の初期値は `false` である
- **AND** `ingredients` を省略した場合の初期値は空配列 `[]` である
- **AND** `imageUrl` を省略した場合の初期値は空文字 `""` である
- **AND** 項目名は `body` のままである

#### Scenario: Body is not renamed
- **WHEN** レシピの本文を読み書きする
- **THEN** フィールド名は `body` である
- **AND** `steps` という項目は存在しない

#### Scenario: Ingredients are human-readable strings
- **WHEN** クライアントが `ingredients` に `{ "name": "砂糖", "amount": "大さじ1" }` を含めて追加する
- **THEN** 応答の当該行は同じ文字列の `name` と `amount` である
- **AND** 数値や単位コードへの変換は行われない

#### Scenario: ImageUrl is a string reference
- **WHEN** クライアントがレシピを読み書きする
- **THEN** `imageUrl` は文字列である
- **AND** 応答に画像バイナリは含まれない

### Requirement: List screen at /
システムは画面 `/` でレシピ一覧を MUST で出す。各カードはお気に入り星、タイトル、作成日時を MUST で示し、カード操作で詳細 `/recipes/:id` へ MUST で遷移する。`imageUrl` が空でなければカードにその画像を MUST で示す。`imageUrl` が空ならカードに画像を出しては MUST NOT である。一覧からレシピを削除する操作は MUST NOT である。一覧カードに材料は出しては MUST NOT である。

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

#### Scenario: Card shows image when imageUrl is set
- **WHEN** `imageUrl` があるレシピが一覧にある状態で `/` を開く
- **THEN** そのカードに画像が出る

#### Scenario: Card omits image when imageUrl is empty
- **WHEN** `imageUrl` が空のレシピが一覧にある状態で `/` を開く
- **THEN** そのカードに画像は出ない
- **AND** 星・タイトル・作成日時は出る

### Requirement: New screen at /new
システムは画面 `/new` で新規追加を MUST で提供する。タイトルは必須、本文は任意で MUST である。材料行の追加・削除・編集を MUST で提供する。材料ゼロでも追加できて MUST である。画像は任意で MUST であり、画像無しでも追加できて MUST である。画像アップロードが使えるときはファイル選択を MUST で提供する。追加に成功したら一覧 `/` へ MUST で戻る。

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

#### Scenario: Create without an image is allowed
- **WHEN** 利用者がタイトルだけ入力し、画像を選ばずに `/new` で追加する
- **THEN** レシピは追加される
- **AND** 詳細に画像は出ない

### Requirement: Detail screen at /recipes/:id
システムは画面 `/recipes/:id` で詳細を MUST で出す。閲覧モードでは本文、作成日時、お気に入り星、材料と分量の一覧、`imageUrl` があるときの画像、編集、削除を MUST で提供する。`imageUrl` が空なら閲覧に画像を出しては MUST NOT である。編集モードでは材料行の追加・削除・編集を MUST で提供する。画像アップロードが使えるときは編集でファイル選択を MUST で提供する。削除は閲覧モードで確認後のハード削除で MUST であり、成功したら一覧へ MUST で戻る。存在しない id では詳細本文や作成日時を出しては MUST NOT である。

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

#### Scenario: View shows image when imageUrl is set
- **WHEN** `imageUrl` があるレシピの詳細を閲覧モードで開く
- **THEN** その画像が出る

#### Scenario: View omits image when imageUrl is empty
- **WHEN** `imageUrl` が空のレシピの詳細を閲覧モードで開く
- **THEN** 画像は出ない

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
システムは `/api/recipes` で次の契約を MUST で提供する。一覧 GET、追加 POST、詳細 GET `/api/recipes/{id}`、部分更新 PATCH `/api/recipes/{id}`（`title` / `body` / `favorite` / `ingredients` / `imageUrl`）、ハード削除 DELETE `/api/recipes/{id}`（成功 204、無し 404）。一覧は `createdAt` の降順で MUST である。PATCH は `createdAt` を変えては MUST NOT である。存在しない id の GET / PATCH / DELETE は 404 で MUST である。GET（一覧・詳細）は常に `ingredients` 配列と `imageUrl` 文字列を MUST で返す。`ingredients` 属性が無い古い想定では `[]` で MUST である。`imageUrl` 属性が無い古い想定では `""` で MUST である。POST で `ingredients` を省略したら `[]` で MUST である。POST で `imageUrl` を省略したら `""` で MUST である。PATCH で `ingredients` を省略したら既存の材料は変えては MUST NOT である。PATCH で `imageUrl` を省略したら既存の参照は変えては MUST NOT である。POST / PATCH のレシピ JSON に画像バイナリを含めては MUST NOT である。

#### Scenario: Create then list and get
- **WHEN** クライアントが POST `/api/recipes` で追加する
- **THEN** 応答は 201 で、そのレシピを含む
- **AND** GET `/api/recipes` に `createdAt` 降順で含まれる
- **AND** GET `/api/recipes/{id}` は 200 で同じ `createdAt` を返す
- **AND** 各 GET のレシピは `ingredients` 配列と `imageUrl` 文字列を含む

#### Scenario: Create omits ingredients
- **WHEN** クライアントが `ingredients` 無しで POST `/api/recipes` する
- **THEN** 応答の `ingredients` は `[]` である
- **AND** その後の GET も `ingredients` は `[]` である

#### Scenario: Create omits imageUrl
- **WHEN** クライアントが `imageUrl` 無しで POST `/api/recipes` する
- **THEN** 応答の `imageUrl` は `""` である
- **AND** その後の GET も `imageUrl` は `""` である

#### Scenario: Patch updates fields without changing createdAt
- **WHEN** クライアントが PATCH `/api/recipes/{id}` で `title`、`body`、`favorite`、`ingredients`、`imageUrl` を順に部分更新する
- **THEN** 各更新後の GET は指定した項目だけ変わり、`createdAt` は作成時のままである

#### Scenario: Patch omits ingredients
- **WHEN** 材料があるレシピに対し、クライアントが `ingredients` を含めずに PATCH する
- **THEN** 既存の `ingredients` は変わらない

#### Scenario: Patch omits imageUrl
- **WHEN** `imageUrl` があるレシピに対し、クライアントが `imageUrl` を含めずに PATCH する
- **THEN** 既存の `imageUrl` は変わらない

#### Scenario: Patch empty imageUrl clears the reference
- **WHEN** クライアントが PATCH で `imageUrl` を `""` にする
- **THEN** 応答の `imageUrl` は `""` である
- **AND** その後の GET も `imageUrl` は `""` である

#### Scenario: Get fills missing ingredients
- **WHEN** `ingredients` 属性が無いレシピ相当を GET する
- **THEN** 応答の `ingredients` は `[]` である

#### Scenario: Get fills missing imageUrl
- **WHEN** `imageUrl` 属性が無いレシピ相当を GET する
- **THEN** 応答の `imageUrl` は `""` である

#### Scenario: Missing id returns 404
- **WHEN** 存在しない id に GET、PATCH、または DELETE する
- **THEN** 応答は 404 である
- **AND** GET のエラー本体に `createdAt` は含まれない

#### Scenario: Delete is hard delete
- **WHEN** クライアントが存在する id を DELETE `/api/recipes/{id}` する
- **THEN** 応答は 204 である
- **AND** その後の GET はその id で 404 である

### Requirement: Persistence is memory locally and DynamoDB in production
`RECIPES_TABLE` が未設定のローカルでは、保存先はプロセス内のメモリ dict で MUST である。フロントを再読み込みしても、backend プロセスが生きている間はデータは MUST で残る。backend 再起動後にメモリ上のデータが残ることは MUST NOT である。本番では DynamoDB テーブル（PK は `id`、一覧は Scan、想定名 `${AWS::StackName}-recipes`）に MUST で残り、CloudFront 配下の画面から読み書きできる。`ingredients` と `imageUrl` は同一アイテムの属性で MUST であり、別テーブルにしては MUST NOT である。画像本体を DynamoDB に保存しては MUST NOT である。`AWS_SAM_LOCAL` が立っているときはメモリ dict で MUST である。

#### Scenario: Local reload keeps data while backend lives
- **WHEN** ローカルで `RECIPES_TABLE` 未設定のままレシピを追加し、フロントだけ再読み込みする
- **THEN** 追加したレシピは一覧に残る

#### Scenario: Production stores by id in DynamoDB
- **WHEN** 本番でレシピを追加・更新・削除する
- **THEN** データは DynamoDB（PK `id`）に反映される
- **AND** 一覧取得は Scan に基づく
- **AND** `ingredients` は同じアイテムのネスト属性として残る
- **AND** `imageUrl` は同じアイテムの文字列属性として残る
- **AND** 再読み込み後もデータが残る

#### Scenario: DynamoDB item does not store image bytes
- **WHEN** 本番で画像付きレシピを保存する
- **THEN** DynamoDB アイテムの `imageUrl` は参照文字列である
- **AND** 画像バイナリは DynamoDB に無い

### Requirement: Resources are not shared with the memo app
このボードはメモアプリ（`ai-demo1-checklist`）とは別システムで MUST である。スタック、テーブル、バケット、API URL、環境変数をメモアプリと共有しては MUST NOT である。画像用バケットもメモアプリと共有しては MUST NOT である。API パスは `/api/recipes` で MUST であり、`/api/memos` を使っては MUST NOT である。環境変数は `RECIPES_TABLE` で MUST であり、`MEMOS_TABLE` を使っては MUST NOT である。

#### Scenario: API path and table env are recipes-specific
- **WHEN** クライアントまたは本番構成がレシピ API に接続する
- **THEN** パスは `/api/recipes` である
- **AND** テーブル環境変数は `RECIPES_TABLE` である
- **AND** メモアプリのスタック名・URL・テーブルは使わない

### Requirement: Baseline excludes later features
この capability の範囲では、検索、カテゴリ、ログイン、管理者機能、モバイルアプリ、ソフト削除、一覧からの削除、タグ、添付、リアルタイム同期を提供しては MUST NOT である。

#### Scenario: Out-of-scope features are absent
- **WHEN** 利用者が現行の3画面と `/api/recipes` を使う
- **THEN** 検索、カテゴリ、ログインの導線や API は無い
- **AND** 材料リストの閲覧と編集は提供されている
- **AND** 画像参照 `imageUrl` と、アップロードが使えるときの画像の表示・選択は提供されている

## ADDED Requirements

### Requirement: Browser uploads image bytes with a presigned URL
画像アップロードが使えるとき、システムは署名付き URL を MUST で発行する。ブラウザは画像本体をその URL へ S3 に PUT して MUST である。画像バイナリを Lambda または API Gateway に流しては MUST NOT である。POST / PATCH `/api/recipes` のボディに画像バイナリを含めては MUST NOT である。

#### Scenario: Client puts the file to the presigned URL
- **WHEN** アップロードが使える環境でクライアントが署名付き URL を要求する
- **THEN** 応答に PUT 用の URL が含まれる
- **AND** クライアントはその URL に画像本体を PUT する
- **AND** `/api/recipes` の POST / PATCH ボディに画像バイナリは含まれない

#### Scenario: Recipe JSON stores only the reference after upload
- **WHEN** ブラウザが S3 への PUT に成功し、レシピの `imageUrl` を更新する
- **THEN** レシピ JSON の `imageUrl` は参照文字列である
- **AND** 画像本体はレシピ JSON に無い

### Requirement: User images are stored in a dedicated bucket
ユーザー画像の本体は専用の画像用バケットに MUST で置く。フロント配信用バケット（画面の `dist`）にユーザー画像を置いては MUST NOT である。

#### Scenario: Image object is not in the frontend bucket
- **WHEN** 利用者がレシピ画像をアップロードする
- **THEN** 本体は画像用バケットにある
- **AND** フロント配信用バケットには無い

### Requirement: Local memory mode skips image upload
`RECIPES_TABLE` が未設定のローカルでは、画像アップロード用の UI を出しては MUST NOT である。保存される `imageUrl` は空文字で MUST である。追加・一覧・詳細・編集・お気に入り切替・削除は MUST で維持する。

#### Scenario: Local create skips the file picker
- **WHEN** `RECIPES_TABLE` 未設定のローカルで利用者が `/new` を開く
- **THEN** 画像のファイル選択は出ない
- **AND** タイトルを入れて追加するとレシピが作られる
- **AND** その `imageUrl` は `""` である

#### Scenario: Local CRUD still works
- **WHEN** `RECIPES_TABLE` 未設定のローカルで利用者が追加・一覧・詳細・編集・お気に入り切替・削除を行う
- **THEN** 各操作は完了する
- **AND** 画像アップロードは行われない

### Requirement: A recipe has at most one optional image
1 レシピあたりの画像は 1 枚までで MUST である。画像無しでもレシピを作れて MUST である。複数枚、リサイズ、サムネイルは提供しては MUST NOT である。

#### Scenario: Second file replaces rather than adding
- **WHEN** 既に `imageUrl` があるレシピの編集で別の画像ファイルを選んで保存する
- **THEN** レシピが持つ画像参照は 1 件のままである
- **AND** 表示される画像は新たに保存した参照である

#### Scenario: Multiple images and thumbnails are absent
- **WHEN** 利用者が新規または詳細の編集を使う
- **THEN** 複数枚を並べて載せる操作は無い
- **AND** サムネイル生成やリサイズの操作は無い
