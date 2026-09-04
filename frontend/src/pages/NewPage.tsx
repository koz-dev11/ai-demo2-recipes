import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  RECIPE_IMAGE_ACCEPT,
  createRecipe,
  getConfig,
  patchRecipe,
  recipeImageError,
  uploadRecipeImage,
  type Ingredient,
} from "../api";

export function NewPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [imageUploadEnabled, setImageUploadEnabled] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    getConfig()
      .then((config) => setImageUploadEnabled(config.imageUploadEnabled))
      .catch(() => setImageUploadEnabled(false));
  }, []);

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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }
    if (!title.trim()) {
      setError("タイトルは必須です。");
      return;
    }
    setError("");
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const created = await createRecipe(title.trim(), body, ingredients);
      if (imageFile) {
        const imageUrl = await uploadRecipeImage(created.id, imageFile);
        await patchRecipe(created.id, { imageUrl });
      }
      navigate("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        message.startsWith("422")
          ? "材料の名前と分量は両方入力してください。"
          : "追加に失敗しました。backend が起動しているか確認してください。",
      );
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <p>
        <Link to="/">一覧へ</Link>
      </p>
      <form onSubmit={onSubmit}>
        <p>
          <label>
            タイトル（必須）
            <br />
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
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
                    />
                  </label>
                  <label>
                    分量
                    <input
                      value={row.amount}
                      onChange={(event) => updateIngredientRow(index, "amount", event.target.value)}
                    />
                  </label>
                  <button type="button" className="secondary" onClick={() => removeIngredientRow(index)}>
                    行を削除
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="actions">
            <button type="button" className="secondary" onClick={addIngredientRow}>
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
            />
          </label>
        </p>
        {imageUploadEnabled ? (
          <p>
            <label>
              料理画像（任意・1枚）
              <br />
              <input type="file" accept={RECIPE_IMAGE_ACCEPT} onChange={onImageChange} />
            </label>
          </p>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        <p className="actions">
          <button type="submit" disabled={submitting}>
            追加
          </button>
        </p>
      </form>
    </section>
  );
}
