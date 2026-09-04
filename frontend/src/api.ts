export type Ingredient = {
  name: string;
  amount: string;
};

export type Recipe = {
  id: string;
  title: string;
  body: string;
  favorite: boolean;
  createdAt: string;
  ingredients: Ingredient[];
  imageUrl: string;
};

export type AppConfig = {
  imageUploadEnabled: boolean;
};

export type ImageUploadUrl = {
  uploadUrl: string;
  imageUrl: string;
};

export const RECIPE_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const RECIPE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const API_BASE = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function listRecipes(): Promise<Recipe[]> {
  return fetch(apiUrl("/api/recipes")).then((res) => parseJson<Recipe[]>(res));
}

export function getRecipe(id: string): Promise<Recipe> {
  return fetch(apiUrl(`/api/recipes/${id}`)).then((res) => parseJson<Recipe>(res));
}

export function createRecipe(title: string, body: string, ingredients: Ingredient[] = []): Promise<Recipe> {
  return fetch(apiUrl("/api/recipes"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body, ingredients }),
  }).then((res) => parseJson<Recipe>(res));
}

export type RecipePatch = {
  title?: string;
  body?: string;
  favorite?: boolean;
  ingredients?: Ingredient[];
  imageUrl?: string;
};

export function patchRecipe(id: string, payload: RecipePatch): Promise<Recipe> {
  return fetch(apiUrl(`/api/recipes/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((res) => parseJson<Recipe>(res));
}

export function patchRecipeFavorite(id: string, favorite: boolean): Promise<Recipe> {
  return patchRecipe(id, { favorite });
}

export async function deleteRecipe(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/recipes/${id}`), { method: "DELETE" });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
}

export function getConfig(): Promise<AppConfig> {
  return fetch(apiUrl("/api/config")).then((res) => parseJson<AppConfig>(res));
}

export function createImageUploadUrl(id: string, contentType: string): Promise<ImageUploadUrl> {
  return fetch(apiUrl(`/api/recipes/${id}/image-upload-url`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType }),
  }).then((res) => parseJson<ImageUploadUrl>(res));
}

export function recipeImageError(file: File): string {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return "jpeg / png / webp の画像を選んでください。";
  }
  if (file.size > RECIPE_IMAGE_MAX_BYTES) {
    return "画像は 5MB 以下にしてください。";
  }
  return "";
}

export async function uploadRecipeImage(id: string, file: File): Promise<string> {
  const { uploadUrl, imageUrl } = await createImageUploadUrl(id, file.type);
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return imageUrl;
}
