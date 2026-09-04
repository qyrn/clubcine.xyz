import { test, expect, type Page } from "@playwright/test";

function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test("le panneau chat affiche un champ de saisie sur /movie malgré des identifiants Supabase de test", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("/movie");

  await expect(page.locator("video")).toBeAttached();
  await expect(page.getByPlaceholder("Envoyer un message")).toBeVisible();

  expect(errors).toEqual([]);
});

test("le raccourci clavier c ne casse rien sur /movie sans piste de sous-titres disponible", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("/movie");
  await expect(page.locator("video")).toBeAttached();

  await page.keyboard.press("c");

  await expect(page.locator("video")).toBeAttached();
  await expect(page.getByPlaceholder("Envoyer un message")).toBeVisible();
  expect(errors).toEqual([]);
});
