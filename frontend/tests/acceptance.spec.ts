import { test, expect } from '@playwright/test';

test('レシピを追加すると一覧に出る、再読み込みしても残る', async ({ page }) => {
  const title = `受け入れ確認 ${Date.now()}`;

  await page.goto('http://127.0.0.1:5173/');
  await expect(page.getByRole('heading', { name: 'レシピ' })).toBeVisible();

  await page.getByRole('link', { name: '追加' }).click();
  await page.getByLabel('タイトル（必須）').fill(title);
  await page.getByRole('button', { name: '追加' }).click();

  const recipeLink = page.getByRole('link', { name: `${title}の詳細` });
  await expect(recipeLink).toBeVisible();

  await page.reload();
  await expect(recipeLink).toBeVisible();
});

test('詳細の閲覧で作成日時が見える。一覧と一致し、編集中は消える', async ({ page }) => {
  const title = `受け入れ確認 ${Date.now()}`;
  const createdAt = page.getByText(/^作成日時 /);

  await page.goto('http://127.0.0.1:5173/');
  await expect(page.getByRole('heading', { name: 'レシピ' })).toBeVisible();

  await page.getByRole('link', { name: '追加' }).click();
  await page.getByLabel('タイトル（必須）').fill(title);
  await page.getByLabel('手順（任意）').fill('詳細の作成日時を確認する');
  await page.getByRole('button', { name: '追加' }).click();

  const recipeLink = page.getByRole('link', { name: `${title}の詳細` });
  await expect(recipeLink).toBeVisible();

  const card = page.locator('li').filter({ has: recipeLink });
  const listCreatedAt = (await card.locator('.created-at').innerText()).trim();

  await recipeLink.click();
  await expect(page.getByRole('heading', { name: title, level: 2 })).toBeVisible();
  await expect(createdAt).toHaveText(`作成日時 ${listCreatedAt}`);

  await page.getByRole('button', { name: '☆ お気に入り' }).click();
  await expect(page.getByRole('button', { name: '★ お気に入り' })).toBeVisible();
  await expect(createdAt).toHaveText(`作成日時 ${listCreatedAt}`);

  await page.getByRole('button', { name: '編集' }).click();
  await expect(createdAt).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: '作成日時', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'キャンセル' }).click();
  await expect(createdAt).toHaveText(`作成日時 ${listCreatedAt}`);

  await page.getByRole('button', { name: '編集' }).click();
  await page.getByLabel('タイトル（必須）').fill(`${title} 保存後`);
  await page.getByRole('button', { name: '保存' }).click();
  await expect(createdAt).toHaveText(`作成日時 ${listCreatedAt}`);

  await page.getByRole('link', { name: '一覧へ' }).click();
  await expect(page.getByRole('link', { name: `${title} 保存後の詳細` })).toBeVisible();
});

test('存在しないレシピでは作成日時を出さない', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/recipes/00000000-0000-4000-8000-000000000000');
  await expect(page.getByText('レシピが見つかりません。')).toBeVisible();
  await expect(page.getByText(/^作成日時 /)).toHaveCount(0);
});

test('詳細の取得失敗では作成日時を出さない', async ({ page }) => {
  await page.route('**/api/recipes/*', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
  );
  await page.goto('http://127.0.0.1:5173/recipes/any-id');
  await expect(page.getByText('詳細の取得に失敗しました。')).toBeVisible();
  await expect(page.getByText(/^作成日時 /)).toHaveCount(0);
});
