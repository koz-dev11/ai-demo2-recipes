import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { listRecipes, patchRecipeFavorite, type Recipe } from "../api";

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

export function ListPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const togglingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    listRecipes()
      .then((data) => {
        setRecipes(data);
        setError("");
      })
      .catch(() => setError("一覧の取得に失敗しました。backend が起動しているか確認してください。"))
      .finally(() => setLoading(false));
  }, []);

  async function onToggle(recipe: Recipe) {
    if (togglingRef.current.has(recipe.id)) {
      return;
    }
    togglingRef.current.add(recipe.id);
    setTogglingIds(new Set(togglingRef.current));
    setError("");
    try {
      const updated = await patchRecipeFavorite(recipe.id, !recipe.favorite);
      setRecipes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch {
      setError("お気に入りの更新に失敗しました。");
    } finally {
      togglingRef.current.delete(recipe.id);
      setTogglingIds(new Set(togglingRef.current));
    }
  }

  return (
    <section>
      <p className="toolbar">
        <Link className="button" to="/new">
          追加
        </Link>
      </p>
      {error ? <p className="error">{error}</p> : null}
      {loading ? <p>読み込み中</p> : null}
      {!loading && recipes.length === 0 && !error ? <p className="empty">レシピはまだありません。</p> : null}
      {recipes.length > 0 ? (
        <ul className="recipe-list">
          {recipes.map((recipe) => (
            <li key={recipe.id} className={recipe.favorite ? "recipe-card favorite" : "recipe-card"}>
              <button
                type="button"
                className={recipe.favorite ? "star favorite" : "star"}
                aria-pressed={recipe.favorite}
                aria-label={`${recipe.title} をお気に入り`}
                disabled={togglingIds.has(recipe.id)}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void onToggle(recipe);
                }}
              >
                {recipe.favorite ? "★" : "☆"}
              </button>
              <div>
                {recipe.imageUrl ? (
                  <img className="recipe-card-image" src={recipe.imageUrl} alt="" />
                ) : null}
                <div className="recipe-title">{recipe.title}</div>
                <div className="created-at">{formatCreatedAt(recipe.createdAt)}</div>
              </div>
              <Link className="recipe-card-hit" to={`/recipes/${recipe.id}`} aria-label={`${recipe.title}の詳細`}>
                {recipe.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
