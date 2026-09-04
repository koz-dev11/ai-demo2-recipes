## MODIFIED Requirements

### Requirement: New screen at /new
システムは画面 `/new` で新規追加を MUST で提供する。タイトルは必須、本文は任意で MUST である。画面上の本文ラベルは「手順（任意）」で MUST であり、送信する JSON の項目名は `body` のまま MUST である。フォームの順はタイトル、材料、本文で MUST であり、材料欄は本文より上で MUST である。材料行の追加・削除・編集を MUST で提供する。材料ゼロでも追加できて MUST である。画像は任意で MUST であり、画像無しでも追加できて MUST である。画像アップロードが使えるときはファイル選択を MUST で提供し、その位置は材料の後で MUST である。追加に成功したら一覧 `/` へ MUST で戻る。

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

#### Scenario: Ingredients field is above body labeled 手順
- **WHEN** 利用者が `/new` を開く
- **THEN** タイトル必須が先頭である
- **AND** 材料欄は本文より上である
- **AND** 本文のラベルは「手順（任意）」である

### Requirement: Detail screen at /recipes/:id
システムは画面 `/recipes/:id` で詳細を MUST で出す。閲覧モードでは本文、作成日時、お気に入り星、材料と分量の一覧、`imageUrl` があるときの画像、編集、削除を MUST で提供する。閲覧の読み順では材料ブロックが本文より上で MUST である。本文の見出しは「手順」で MUST である。本文が空なら見出しの下に「（本文なし）」を MUST で出す。`imageUrl` が空なら閲覧に画像を出しては MUST NOT である。編集モードでは材料行の追加・削除・編集を MUST で提供する。編集の材料欄は本文より上で MUST である。編集の本文ラベルは「手順（任意）」で MUST であり、保存する JSON の項目名は `body` のまま MUST である。画像アップロードが使えるときは編集でファイル選択を MUST で提供する。削除は閲覧モードで確認後のハード削除で MUST であり、成功したら一覧へ MUST で戻る。存在しない id では詳細本文や作成日時を出しては MUST NOT である。

#### Scenario: View shows body, created time, favorite, edit, and delete
- **WHEN** 存在するレシピの `/recipes/:id` を閲覧モードで開く
- **THEN** タイトル、本文（無ければ本文なしであることが分かる表示）、作成日時、お気に入り星、材料と分量の一覧（無ければ材料なしであることが分かる表示）、編集、削除が出る

#### Scenario: View puts ingredients above body labeled 手順
- **WHEN** 存在するレシピの `/recipes/:id` を閲覧モードで開く
- **THEN** 材料ブロックは本文より上である
- **AND** 本文の見出しは「手順」である
- **AND** 本文が空なら見出しの下に「（本文なし）」が出る

#### Scenario: Created time matches list and hides while editing
- **WHEN** 利用者が一覧の作成日時と同じレシピの詳細を開く
- **THEN** 詳細の作成日時は一覧と一致する
- **AND** 編集中は作成日時を出さない
- **AND** 保存後も作成日時は変わらない

#### Scenario: Edit updates ingredient rows
- **WHEN** 利用者が詳細の編集で材料行を追加・削除・編集して保存する
- **THEN** 閲覧モードの材料一覧は保存した内容になる
- **AND** 一覧カードには材料は出ない

#### Scenario: Edit puts ingredients above body labeled 手順
- **WHEN** 利用者が詳細を編集モードで開く
- **THEN** 材料欄は本文より上である
- **AND** 本文のラベルは「手順（任意）」である

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
