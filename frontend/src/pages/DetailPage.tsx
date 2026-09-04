import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  RECIPE_IMAGE_ACCEPT,
  deleteRecipe,
  getConfig,
  getRecipe,
  patchRecipe,
  patchRecipeFavorite,
  recipeImageError,
  uploadRecipeImage,
  type Ingredient,
  type Recipe,
} from "../api";

function formatCreatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [imageUploadEnabled, setImageUploadEnabled] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    getConfig()
      .then((config) => setImageUploadEnabled(config.imageUploadEnabled))
      .catch(() => setImageUploadEnabled(false));
  }, []);

  useEffect(() => {
    setError("");
    setEditing(false);
    if (!id) {
      setRecipe(null);
      setError("レシピが見つかりません。");
      return;
    }
    getRecipe(id)
      .then((data) => {
        setRecipe(data);
        setError("");
      })
      .catch((err: Error) => {
        setRecipe(null);
        setError(err.message.startsWith("404") ? "レシピが見つかりません。" : "詳細の取得に失敗しました。");
      });
  }, [id]);

  function startEdit() {
    if (!recipe || savingRef.current) {
      return;
    }
    setTitle(recipe.title);
    setBody(recipe.body);
    setIngredients(recipe.ingredients.map((row) => ({ ...row })));
    setImageFile(null);
    setError("");
    setEditing(true);
  }

  function cancelEdit() {
    if (savingRef.current) {
      return;
    }
    setEditing(false);
    setImageFile(null);
    setError("");
  }

  async function onToggle() {
    if (!recipe || editing || savingRef.current) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const updated = await patchRecipeFavorite(recipe.id, !recipe.favorite);
      setRecipe(updated);
      setError("");
    } catch {
      setError("お気に入りの更新に失敗しました。");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!recipe || savingRef.current) {
      return;
    }
    if (!title.trim()) {
      setError("タイトルは必須です。");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      let updated = await patchRecipe(recipe.id, { title: title.trim(), body, ingredients });
      if (imageFile) {
        const imageUrl = await uploadRecipeImage(recipe.id, imageFile);
        updated = await patchRecipe(recipe.id, { imageUrl });
      }
      setRecipe(updated);
      setImageFile(null);
      setEditing(false);
      setError("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(message.startsWith("422") ? "材料の名前と分量は両方入力してください。" : "保存に失敗しました。");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function addIngredientRow() {
    setIngredients((rows) => [...rows, { name: "", amount: "" }]);
  }

  function removeIngredientRow(index: number) {
    setIngredients((rows) => rows.filter((_, i) => i !== index));
  }

  function updateIngredientRow(index: number, field: keyof Ingredient, value: string) {
    setIngredients((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function onImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setImageFile(null);
      return;
    }
    const message = recipeImageError(file);
    if (message) {
      setError(message);
      setImageFile(null);
      event.target.value = "";
      return;
    }
    setError("");
    setImageFile(file);
  }

  async function onDelete() {
    if (!recipe || editing || savingRef.current) {
      return;
    }
    if (!window.confirm("このレシピを削除しますか？")) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await deleteRecipe(recipe.id);
      navigate("/");
    } catch {
      setError("削除に失敗しました。");
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <section className="panel">
      <p>
        <Link to="/">一覧へ</Link>
      </p>
      {error ? <p className="error">{error}</p> : null}
      {recipe ? (
        editing ? (
          <form onSubmit={onSave}>
            <p>
              <label>
                タイトル（必須）
                <br />
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  disabled={saving}
                />
              </label>
            </p>
            <fieldset className="ingredient-fieldset">
              <legend>材料（任意）</legend>
              {ingredients.length === 0 ? <p className="muted">材料行はまだありません。</p> : null}
              {ingredients.length > 0 ? (
                <ul className="ingredient-rows">
                  {ingredients.map((row, index) => (
                    <li key={index} className="ingredient-row">
                      <label>
                        名前
                        <input
                          value={row.name}
                          onChange={(event) => updateIngredientRow(index, "name", event.target.value)}
                          disabled={saving}
                        />
                      </label>
                      <label>
                        分量
                        <input
                          value={row.amount}
                          onChange={(event) => updateIngredientRow(index, "amount", event.target.value)}
                          disabled={saving}
                        />
                      </label>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => removeIngredientRow(index)}
                        disabled={saving}
                      >
                        行を削除
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="actions">
                <button type="button" className="secondary" onClick={addIngredientRow} disabled={saving}>
                  材料行を追加
                </button>
              </p>
            </fieldset>
            <p>
              <label>
                手順（任意）
                <br />
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={6}
                  disabled={saving}
                />
              </label>
            </p>
            {imageUploadEnabled ? (
              <p>
                <label>
                  料理画像（任意・1枚）
                  <br />
                  <input
                    type="file"
                    accept={RECIPE_IMAGE_ACCEPT}
                    onChange={onImageChange}
                    disabled={saving}
                  />
                </label>
              </p>
            ) : null}
            <p className="actions">
              <button type="submit" disabled={saving}>
                保存
              </button>
              <button type="button" className="secondary" onClick={cancelEdit} disabled={saving}>
                キャンセル
              </button>
            </p>
          </form>
        ) : (
          <>
            <h2>{recipe.title}</h2>
            {recipe.imageUrl ? (
              <img className="recipe-detail-image" src={recipe.imageUrl} alt="" />
            ) : null}
            <p className="detail-created-at">
              作成日時 {formatCreatedAt(recipe.createdAt)}
            </p>
            <p>
              <button
                type="button"
                className={recipe.favorite ? "status-pill favorite" : "status-pill"}
                aria-pressed={recipe.favorite}
                disabled={saving}
                onClick={onToggle}
              >
                {recipe.favorite ? "★ お気に入り" : "☆ お気に入り"}
              </button>
            </p>
            <h3>材料</h3>
            {recipe.ingredients.length === 0 ? (
              <p className="muted">（材料なし）</p>
            ) : (
              <ul className="ingredient-view">
                {recipe.ingredients.map((row, index) => (
                  <li key={index}>
                    {row.name} {row.amount}
                  </li>
                ))}
              </ul>
            )}
            <h3>手順</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{recipe.body || "（本文なし）"}</p>
            <p className="actions">
              <button type="button" onClick={startEdit} disabled={saving}>
                編集
              </button>
              <button type="button" className="secondary" onClick={onDelete} disabled={saving}>
                削除
              </button>
            </p>
          </>
        )
      ) : null}
    </section>
  );
}
