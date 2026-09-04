import os
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from mangum import Mangum
from pydantic import BaseModel, Field, field_validator

app = FastAPI()
handler = Mangum(app, lifespan="off", api_gateway_base_path="prod")

recipes: dict[str, dict] = {}

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


class Ingredient(BaseModel):
    name: str = ""
    amount: str = ""

    @field_validator("name", "amount", mode="before")
    @classmethod
    def strip_text(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class RecipeCreate(BaseModel):
    title: str = Field(min_length=1)
    body: str = ""
    ingredients: list[Ingredient] = Field(default_factory=list)
    imageUrl: str = ""

    @field_validator("title", "imageUrl", mode="before")
    @classmethod
    def strip_title(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class RecipePatch(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    body: str | None = None
    favorite: bool | None = None
    ingredients: list[Ingredient] | None = None
    imageUrl: str | None = None

    @field_validator("title", "imageUrl", mode="before")
    @classmethod
    def strip_title(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class ImageUploadRequest(BaseModel):
    contentType: str


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _use_memory() -> bool:
    return (not os.environ.get("RECIPES_TABLE")) or bool(os.environ.get("AWS_SAM_LOCAL"))


def _image_upload_enabled() -> bool:
    return (not _use_memory()) and bool(os.environ.get("RECIPE_IMAGES_BUCKET"))


def _table():
    import boto3

    return boto3.resource("dynamodb").Table(os.environ["RECIPES_TABLE"])


def _normalize_ingredients(rows: list[Ingredient]) -> list[dict]:
    normalized: list[dict] = []
    for row in rows:
        name = row.name.strip()
        amount = row.amount.strip()
        if not name and not amount:
            continue
        if not name or not amount:
            raise HTTPException(status_code=422, detail="材料の名前と分量は両方必要です。")
        normalized.append({"name": name, "amount": amount})
    return normalized


def _from_item(item: dict) -> dict:
    raw_ingredients = item.get("ingredients")
    ingredients = []
    if isinstance(raw_ingredients, list):
        ingredients = [
            {"name": str(row.get("name", "")), "amount": str(row.get("amount", ""))}
            for row in raw_ingredients
            if isinstance(row, dict)
        ]
    image_url = item.get("imageUrl")
    if image_url is None:
        image_url = ""
    return {
        "id": item["id"],
        "title": item["title"],
        "body": item.get("body") or "",
        "favorite": bool(item.get("favorite", False)),
        "createdAt": item["createdAt"],
        "ingredients": ingredients,
        "imageUrl": str(image_url),
    }


def _list_recipes_store() -> list[dict]:
    if _use_memory():
        items = [_from_item(item) for item in recipes.values()]
        items.sort(key=lambda m: m["createdAt"], reverse=True)
        return items

    items = _table().scan().get("Items") or []
    items.sort(key=lambda m: m.get("createdAt", ""), reverse=True)
    return [_from_item(item) for item in items]


def _create_recipe_store(title: str, body: str, ingredients: list[dict], image_url: str) -> dict:
    recipe = {
        "id": str(uuid4()),
        "title": title,
        "body": body,
        "favorite": False,
        "createdAt": _now_iso(),
        "ingredients": ingredients,
        "imageUrl": image_url,
    }
    if _use_memory():
        recipes[recipe["id"]] = recipe
        return _from_item(recipe)

    _table().put_item(Item=recipe)
    return _from_item(recipe)


def _get_recipe_store(recipe_id: str) -> dict | None:
    if _use_memory():
        recipe = recipes.get(recipe_id)
        return None if recipe is None else _from_item(recipe)

    item = _table().get_item(Key={"id": recipe_id}).get("Item")
    if item is None:
        return None
    return _from_item(item)


def _apply_patch(recipe: dict, payload: RecipePatch) -> dict:
    normalized = None
    if payload.ingredients is not None:
        normalized = _normalize_ingredients(payload.ingredients)
    if payload.title is not None:
        recipe["title"] = payload.title
    if payload.body is not None:
        recipe["body"] = payload.body
    if payload.favorite is not None:
        recipe["favorite"] = payload.favorite
    if normalized is not None:
        recipe["ingredients"] = normalized
    if payload.imageUrl is not None:
        recipe["imageUrl"] = payload.imageUrl
    return recipe


def _patch_recipe_store(recipe_id: str, payload: RecipePatch) -> dict | None:
    if _use_memory():
        recipe = recipes.get(recipe_id)
        if recipe is None:
            return None
        _apply_patch(recipe, payload)
        return _from_item(recipe)

    table = _table()
    item = table.get_item(Key={"id": recipe_id}).get("Item")
    if item is None:
        return None
    recipe = _apply_patch(_from_item(item), payload)
    table.put_item(Item=recipe)
    return recipe


def _delete_recipe_store(recipe_id: str) -> bool:
    if _use_memory():
        if recipe_id not in recipes:
            return False
        del recipes[recipe_id]
        return True

    table = _table()
    item = table.get_item(Key={"id": recipe_id}).get("Item")
    if item is None:
        return False
    table.delete_item(Key={"id": recipe_id})
    return True


@app.get("/api/config")
def get_config():
    return {"imageUploadEnabled": _image_upload_enabled()}


@app.get("/api/recipes")
def list_recipes():
    return _list_recipes_store()


@app.post("/api/recipes", status_code=201)
def create_recipe(payload: RecipeCreate):
    ingredients = _normalize_ingredients(payload.ingredients)
    return _create_recipe_store(payload.title, payload.body, ingredients, payload.imageUrl)


@app.post("/api/recipes/{recipe_id}/image-upload-url")
def create_image_upload_url(recipe_id: str, payload: ImageUploadRequest):
    if not _image_upload_enabled():
        raise HTTPException(status_code=501, detail="Image upload is not available")
    if payload.contentType not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=422, detail="Unsupported image type")
    recipe = _get_recipe_store(recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")

    upload_id = str(uuid4())
    object_key = f"recipes/{recipe_id}/{upload_id}"
    bucket = os.environ["RECIPE_IMAGES_BUCKET"]
    public_base = (os.environ.get("RECIPE_IMAGES_PUBLIC_BASE") or "").rstrip("/")
    import boto3

    upload_url = boto3.client("s3").generate_presigned_url(
        "put_object",
        Params={"Bucket": bucket, "Key": object_key, "ContentType": payload.contentType},
        ExpiresIn=300,
    )
    image_url = f"{public_base}/{object_key}" if public_base else f"https://{bucket}.s3.amazonaws.com/{object_key}"
    return {"uploadUrl": upload_url, "imageUrl": image_url}


@app.get("/api/recipes/{recipe_id}")
def get_recipe(recipe_id: str):
    recipe = _get_recipe_store(recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@app.patch("/api/recipes/{recipe_id}")
def patch_recipe(recipe_id: str, payload: RecipePatch):
    recipe = _patch_recipe_store(recipe_id, payload)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@app.delete("/api/recipes/{recipe_id}", status_code=204)
def delete_recipe(recipe_id: str):
    if not _delete_recipe_store(recipe_id):
        raise HTTPException(status_code=404, detail="Recipe not found")
    return None
