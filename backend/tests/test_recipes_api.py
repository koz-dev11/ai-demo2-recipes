import pytest
from fastapi.testclient import TestClient


def test_create_then_get_includes_created_at(client: TestClient) -> None:
    created = client.post("/api/recipes", json={"title": "契約確認", "body": "本文"})
    assert created.status_code == 201
    created_json = created.json()
    assert created_json.get("createdAt")
    recipe_id = created_json["id"]

    fetched = client.get(f"/api/recipes/{recipe_id}")
    assert fetched.status_code == 200
    fetched_json = fetched.json()
    assert fetched_json.get("createdAt")
    assert fetched_json["createdAt"] == created_json["createdAt"]
    assert fetched_json["favorite"] is False
    assert fetched_json["imageUrl"] == ""
    assert created_json["imageUrl"] == ""


def test_patch_title_body_favorite_does_not_change_created_at(client: TestClient) -> None:
    created = client.post("/api/recipes", json={"title": "元タイトル", "body": "元本文"})
    assert created.status_code == 201
    recipe_id = created.json()["id"]
    original_created_at = created.json()["createdAt"]
    assert original_created_at

    title_patch = client.patch(f"/api/recipes/{recipe_id}", json={"title": "新タイトル"})
    assert title_patch.status_code == 200
    after_title = client.get(f"/api/recipes/{recipe_id}")
    assert after_title.status_code == 200
    title_json = after_title.json()
    assert title_json["title"] == "新タイトル"
    assert title_json["createdAt"] == original_created_at

    body_patch = client.patch(f"/api/recipes/{recipe_id}", json={"body": "新本文"})
    assert body_patch.status_code == 200
    after_body = client.get(f"/api/recipes/{recipe_id}")
    assert after_body.status_code == 200
    body_json = after_body.json()
    assert body_json["body"] == "新本文"
    assert body_json["createdAt"] == original_created_at

    favorite_patch = client.patch(f"/api/recipes/{recipe_id}", json={"favorite": True})
    assert favorite_patch.status_code == 200
    after_favorite = client.get(f"/api/recipes/{recipe_id}")
    assert after_favorite.status_code == 200
    favorite_json = after_favorite.json()
    assert favorite_json["favorite"] is True
    assert favorite_json["createdAt"] == original_created_at


@pytest.mark.parametrize("title", ["", "   "])
def test_create_blank_title_returns_422(client: TestClient, title: str) -> None:
    response = client.post("/api/recipes", json={"title": title})
    assert response.status_code == 422
    listed = client.get("/api/recipes")
    assert listed.status_code == 200
    assert listed.json() == []


def test_get_missing_recipe_returns_404(client: TestClient) -> None:
    response = client.get("/api/recipes/missing-recipe-id")
    assert response.status_code == 404
    body = response.json()
    assert "createdAt" not in body


def test_create_with_ingredients_keeps_human_readable_strings(client: TestClient) -> None:
    created = client.post(
        "/api/recipes",
        json={
            "title": "砂糖クッキー",
            "ingredients": [{"name": "砂糖", "amount": "大さじ1"}, {"name": "粉", "amount": "100g"}],
        },
    )
    assert created.status_code == 201
    created_json = created.json()
    assert created_json["ingredients"] == [
        {"name": "砂糖", "amount": "大さじ1"},
        {"name": "粉", "amount": "100g"},
    ]
    fetched = client.get(f"/api/recipes/{created_json['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["ingredients"] == created_json["ingredients"]


def test_create_omits_ingredients_defaults_to_empty_list(client: TestClient) -> None:
    created = client.post("/api/recipes", json={"title": "材料なし"})
    assert created.status_code == 201
    assert created.json()["ingredients"] == []
    fetched = client.get(f"/api/recipes/{created.json()['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["ingredients"] == []
    listed = client.get("/api/recipes")
    assert listed.status_code == 200
    assert listed.json()[0]["ingredients"] == []


def test_create_empty_ingredients_array(client: TestClient) -> None:
    created = client.post("/api/recipes", json={"title": "空配列", "ingredients": []})
    assert created.status_code == 201
    assert created.json()["ingredients"] == []


def test_create_drops_blank_only_ingredient_rows(client: TestClient) -> None:
    created = client.post(
        "/api/recipes",
        json={
            "title": "空白行捨て",
            "ingredients": [
                {"name": "砂糖", "amount": "大さじ1"},
                {"name": "", "amount": ""},
                {"name": "  ", "amount": "  "},
            ],
        },
    )
    assert created.status_code == 201
    assert created.json()["ingredients"] == [{"name": "砂糖", "amount": "大さじ1"}]


@pytest.mark.parametrize(
    "row",
    [{"name": "砂糖", "amount": ""}, {"name": "", "amount": "大さじ1"}, {"name": "塩", "amount": "   "}],
)
def test_create_one_sided_ingredient_returns_422(client: TestClient, row: dict[str, str]) -> None:
    response = client.post("/api/recipes", json={"title": "不正材料", "ingredients": [row]})
    assert response.status_code == 422
    listed = client.get("/api/recipes")
    assert listed.status_code == 200
    assert listed.json() == []


def test_patch_ingredients_and_omit_preserves_created_at(client: TestClient) -> None:
    created = client.post(
        "/api/recipes",
        json={"title": "更新", "ingredients": [{"name": "砂糖", "amount": "大さじ1"}]},
    )
    assert created.status_code == 201
    recipe_id = created.json()["id"]
    original_created_at = created.json()["createdAt"]

    patched = client.patch(
        f"/api/recipes/{recipe_id}",
        json={"ingredients": [{"name": "塩", "amount": "ひとつまみ"}]},
    )
    assert patched.status_code == 200
    after = client.get(f"/api/recipes/{recipe_id}")
    assert after.status_code == 200
    after_json = after.json()
    assert after_json["ingredients"] == [{"name": "塩", "amount": "ひとつまみ"}]
    assert after_json["createdAt"] == original_created_at
    assert after_json["title"] == "更新"

    favorite_only = client.patch(f"/api/recipes/{recipe_id}", json={"favorite": True})
    assert favorite_only.status_code == 200
    omitted = client.get(f"/api/recipes/{recipe_id}")
    assert omitted.status_code == 200
    omitted_json = omitted.json()
    assert omitted_json["ingredients"] == [{"name": "塩", "amount": "ひとつまみ"}]
    assert omitted_json["favorite"] is True
    assert omitted_json["createdAt"] == original_created_at

    cleared = client.patch(f"/api/recipes/{recipe_id}", json={"ingredients": []})
    assert cleared.status_code == 200
    assert client.get(f"/api/recipes/{recipe_id}").json()["ingredients"] == []


@pytest.mark.parametrize(
    "row",
    [{"name": "砂糖", "amount": ""}, {"name": "", "amount": "大さじ1"}],
)
def test_patch_one_sided_ingredient_returns_422(client: TestClient, row: dict[str, str]) -> None:
    created = client.post(
        "/api/recipes",
        json={"title": "既存", "ingredients": [{"name": "粉", "amount": "100g"}]},
    )
    recipe_id = created.json()["id"]
    patched = client.patch(f"/api/recipes/{recipe_id}", json={"ingredients": [row], "title": "変えない"})
    assert patched.status_code == 422
    fetched = client.get(f"/api/recipes/{recipe_id}")
    assert fetched.status_code == 200
    fetched_json = fetched.json()
    assert fetched_json["title"] == "既存"
    assert fetched_json["ingredients"] == [{"name": "粉", "amount": "100g"}]


def test_get_fills_missing_ingredients(client: TestClient) -> None:
    import main

    created = client.post("/api/recipes", json={"title": "古い形"})
    recipe_id = created.json()["id"]
    del main.recipes[recipe_id]["ingredients"]
    fetched = client.get(f"/api/recipes/{recipe_id}")
    assert fetched.status_code == 200
    assert fetched.json()["ingredients"] == []
    listed = client.get("/api/recipes")
    assert listed.json()[0]["ingredients"] == []


def test_create_omits_image_url_defaults_to_empty_string(client: TestClient) -> None:
    created = client.post("/api/recipes", json={"title": "画像なし"})
    assert created.status_code == 201
    assert created.json()["imageUrl"] == ""
    fetched = client.get(f"/api/recipes/{created.json()['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["imageUrl"] == ""
    listed = client.get("/api/recipes")
    assert listed.status_code == 200
    assert listed.json()[0]["imageUrl"] == ""


def test_get_fills_missing_image_url(client: TestClient) -> None:
    import main

    created = client.post("/api/recipes", json={"title": "古い画像なし"})
    recipe_id = created.json()["id"]
    del main.recipes[recipe_id]["imageUrl"]
    fetched = client.get(f"/api/recipes/{recipe_id}")
    assert fetched.status_code == 200
    assert fetched.json()["imageUrl"] == ""
    listed = client.get("/api/recipes")
    assert listed.json()[0]["imageUrl"] == ""


def test_patch_image_url_omit_preserves_and_empty_clears(client: TestClient) -> None:
    created = client.post("/api/recipes", json={"title": "画像更新"})
    assert created.status_code == 201
    recipe_id = created.json()["id"]
    original_created_at = created.json()["createdAt"]

    patched = client.patch(
        f"/api/recipes/{recipe_id}",
        json={"imageUrl": "https://example.cloudfront.net/recipes/x/y"},
    )
    assert patched.status_code == 200
    after = client.get(f"/api/recipes/{recipe_id}")
    assert after.status_code == 200
    after_json = after.json()
    assert after_json["imageUrl"] == "https://example.cloudfront.net/recipes/x/y"
    assert after_json["createdAt"] == original_created_at
    assert after_json["title"] == "画像更新"

    favorite_only = client.patch(f"/api/recipes/{recipe_id}", json={"favorite": True})
    assert favorite_only.status_code == 200
    omitted = client.get(f"/api/recipes/{recipe_id}")
    assert omitted.status_code == 200
    omitted_json = omitted.json()
    assert omitted_json["imageUrl"] == "https://example.cloudfront.net/recipes/x/y"
    assert omitted_json["favorite"] is True
    assert omitted_json["createdAt"] == original_created_at

    cleared = client.patch(f"/api/recipes/{recipe_id}", json={"imageUrl": ""})
    assert cleared.status_code == 200
    assert client.get(f"/api/recipes/{recipe_id}").json()["imageUrl"] == ""


def test_config_image_upload_disabled_in_memory_mode(client: TestClient) -> None:
    response = client.get("/api/config")
    assert response.status_code == 200
    assert response.json() == {"imageUploadEnabled": False}


def test_image_upload_url_returns_501_in_memory_mode(client: TestClient) -> None:
    created = client.post("/api/recipes", json={"title": "署名不可"})
    recipe_id = created.json()["id"]
    response = client.post(
        f"/api/recipes/{recipe_id}/image-upload-url",
        json={"contentType": "image/jpeg"},
    )
    assert response.status_code == 501


def test_image_upload_url_validates_when_enabled(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    import main

    monkeypatch.setattr(main, "_image_upload_enabled", lambda: True)
    created = client.post("/api/recipes", json={"title": "有効時検証"})
    recipe_id = created.json()["id"]

    unsupported = client.post(
        f"/api/recipes/{recipe_id}/image-upload-url",
        json={"contentType": "application/pdf"},
    )
    assert unsupported.status_code == 422

    missing = client.post(
        "/api/recipes/missing-recipe-id/image-upload-url",
        json={"contentType": "image/jpeg"},
    )
    assert missing.status_code == 404


def test_delete_returns_204_then_404(client: TestClient) -> None:
    created = client.post("/api/recipes", json={"title": "消す"})
    recipe_id = created.json()["id"]
    deleted = client.delete(f"/api/recipes/{recipe_id}")
    assert deleted.status_code == 204
    missing = client.get(f"/api/recipes/{recipe_id}")
    assert missing.status_code == 404
