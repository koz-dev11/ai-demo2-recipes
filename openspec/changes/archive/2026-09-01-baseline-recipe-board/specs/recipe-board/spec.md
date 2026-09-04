## Purpose

認証なしの公開レシピボードとして、レシピの追加・一覧・詳細・編集・削除と、ボード全体で共有するお気に入り星を提供する。

## ADDED Requirements

### Requirement: Recipe record uses id, title, body, favorite, createdAt
システムは各レシピを JSON の camelCase で表し、項目は `id`（UUID）、`title`、`body`、`favorite`、`createdAt` で MUST である。`body` はメモ由来の本文のまま MUST であり、`steps` に改名しては MUST NOT である。完了フラグ `done` は使っては MUST NOT である。

#### Scenario: Created recipe returns the five fields
- **WHEN** クライアントがタイトルと任意の本文でレシピを追加する
- **THEN** 応答は `id`、`title`、`body`、`favorite`、`createdAt` を含む
- **AND** `favorite` の初期値は `false` である
- **AND** 項目名は `body` のままである

#### Scenario: Body is not renamed
- **WHEN** レシピの本文を読み書きする
- **THEN** フィールド名は `body` である
- **AND** `steps` という項目は存在しない

### Requirement: Board is public without authentication
ボードは認証なしの公開レシピボードで MUST である。個人情報・業務データは入れない前提であり、ログインは要求しては MUST NOT である。お気に入りは利用者ごとの状態ではなく、ボード全体で共有する星で MUST である。

#### Scenario: Operations work without login
- **WHEN** 未ログインの利用者が一覧・追加・詳細・編集・削除・お気に入り切替を行う
- **THEN** 認証画面やログイン要求は出ない
- **AND** 操作は公開ボードとして完了する

### Requirement: List screen at /
システムは画面 `/` でレシピ一覧を MUST で出す。各カードはお気に入り星、タイトル、作成日時を MUST で示し、カード操作で詳細 `/recipes/:id` へ MUST で遷移する。一覧からレシピを削除する操作は MUST NOT である。

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

### Requirement: New screen at /new
システムは画面 `/new` で新規追加を MUST で提供する。タイトルは必須、本文は任意で MUST である。追加に成功したら一覧 `/` へ MUST で戻る。

#### Scenario: Title is required
- **WHEN** 利用者がタイトル空のまま `/new` で追加しようとする
- **THEN** レシピは追加されない
- **AND** タイトル必須であることが分かる

#### Scenario: Successful create returns to list
- **WHEN** 利用者が必須のタイトルと任意の本文で追加する
- **THEN** 一覧 `/` に戻り、そのレシピが一覧に出る

### Requirement: Detail screen at /recipes/:id
システムは画面 `/recipes/:id` で詳細を MUST で出す。閲覧モードでは本文、作成日時、お気に入り星、編集、削除を MUST で提供する。削除は閲覧モードで確認後のハード削除で MUST であり、成功したら一覧へ MUST で戻る。存在しない id では詳細本文や作成日時を出しては MUST NOT である。

#### Scenario: View shows body, created time, favorite, edit, and delete
- **WHEN** 存在するレシピの `/recipes/:id` を閲覧モードで開く
- **THEN** タイトル、本文（無ければ本文なしであることが分かる表示）、作成日時、お気に入り星、編集、削除が出る

#### Scenario: Created time matches list and hides while editing
- **WHEN** 利用者が一覧の作成日時と同じレシピの詳細を開く
- **THEN** 詳細の作成日時は一覧と一致する
- **AND** 編集中は作成日時を出さない
- **AND** 保存後も作成日時は変わらない

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
システムは `/api/recipes` で次の契約を MUST で提供する。一覧 GET、追加 POST、詳細 GET `/api/recipes/{id}`、部分更新 PATCH `/api/recipes/{id}`（`title` / `body` / `favorite`）、ハード削除 DELETE `/api/recipes/{id}`（成功 204、無し 404）。一覧は `createdAt` の降順で MUST である。PATCH は `createdAt` を変えては MUST NOT である。存在しない id の GET / PATCH / DELETE は 404 で MUST である。

#### Scenario: Create then list and get
- **WHEN** クライアントが POST `/api/recipes` で追加する
- **THEN** 応答は 201 で、そのレシピを含む
- **AND** GET `/api/recipes` に `createdAt` 降順で含まれる
- **AND** GET `/api/recipes/{id}` は 200 で同じ `createdAt` を返す

#### Scenario: Patch updates fields without changing createdAt
- **WHEN** クライアントが PATCH `/api/recipes/{id}` で `title`、`body`、`favorite` を順に部分更新する
- **THEN** 各更新後の GET は指定した項目だけ変わり、`createdAt` は作成時のままである

#### Scenario: Missing id returns 404
- **WHEN** 存在しない id に GET、PATCH、または DELETE する
- **THEN** 応答は 404 である
- **AND** GET のエラー本体に `createdAt` は含まれない

#### Scenario: Delete is hard delete
- **WHEN** クライアントが存在する id を DELETE `/api/recipes/{id}` する
- **THEN** 応答は 204 である
- **AND** その後の GET はその id で 404 である

### Requirement: Blank title is rejected
タイトルは前後空白を除いたうえで1文字以上で MUST である。空白のみのタイトルでは作成しては MUST NOT であり、API は 422 を MUST で返す。

#### Scenario: Whitespace-only title is not stored
- **WHEN** クライアントが `title` が空文字または空白のみで POST `/api/recipes` する
- **THEN** 応答は 422 である
- **AND** 一覧は増えない

### Requirement: Favorite is a board-wide star
お気に入りは認証なしのボード全体の星で MUST である。一覧の星と詳細の星は同じ `favorite` を MUST で切替し、誰が見ても同じ状態で MUST である。

#### Scenario: Toggle on list updates the board star
- **WHEN** 利用者が一覧カードの星を押す
- **THEN** そのレシピの `favorite` が切り替わる
- **AND** 詳細を開いても同じ星の状態である

#### Scenario: Toggle on detail persists
- **WHEN** 利用者が詳細の星を押す
- **THEN** `favorite` が切り替わる
- **AND** 一覧に戻っても同じ星の状態である

### Requirement: Persistence is memory locally and DynamoDB in production
`RECIPES_TABLE` が未設定のローカルでは、保存先はプロセス内のメモリ dict で MUST である。フロントを再読み込みしても、backend プロセスが生きている間はデータは MUST で残る。backend 再起動後にメモリ上のデータが残ることは MUST NOT である。本番では DynamoDB テーブル（PK は `id`、一覧は Scan、想定名 `${AWS::StackName}-recipes`）に MUST で残り、CloudFront 配下の画面から読み書きできる。`AWS_SAM_LOCAL` が立っているときはメモリ dict で MUST である。

#### Scenario: Local reload keeps data while backend lives
- **WHEN** ローカルで `RECIPES_TABLE` 未設定のままレシピを追加し、フロントだけ再読み込みする
- **THEN** 追加したレシピは一覧に残る

#### Scenario: Production stores by id in DynamoDB
- **WHEN** 本番でレシピを追加・更新・削除する
- **THEN** データは DynamoDB（PK `id`）に反映される
- **AND** 一覧取得は Scan に基づく
- **AND** 再読み込み後もデータが残る

### Requirement: Resources are not shared with the memo app
このボードはメモアプリ（`ai-demo1-checklist`）とは別システムで MUST である。スタック、テーブル、バケット、API URL、環境変数をメモアプリと共有しては MUST NOT である。API パスは `/api/recipes` で MUST であり、`/api/memos` を使っては MUST NOT である。環境変数は `RECIPES_TABLE` で MUST であり、`MEMOS_TABLE` を使っては MUST NOT である。

#### Scenario: API path and table env are recipes-specific
- **WHEN** クライアントまたは本番構成がレシピ API に接続する
- **THEN** パスは `/api/recipes` である
- **AND** テーブル環境変数は `RECIPES_TABLE` である
- **AND** メモアプリのスタック名・URL・テーブルは使わない

### Requirement: Baseline excludes later features
この capability の範囲では、材料リスト、検索、カテゴリ、画像アップロード、ログイン、管理者機能、モバイルアプリ、ソフト削除、一覧からの削除、タグ、添付、リアルタイム同期を提供しては MUST NOT である。

#### Scenario: Out-of-scope features are absent
- **WHEN** 利用者が現行の3画面と `/api/recipes` を使う
- **THEN** 材料リスト、検索、カテゴリ、画像アップロード、ログインの導線や API は無い
