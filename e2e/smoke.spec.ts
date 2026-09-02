import { test, expect, type Page } from "@playwright/test";

function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test("home renders the brand, nav and a hero title", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("/");

  await expect(page).toHaveTitle(/club ciné/i);
  await expect(page.getByRole("link", { name: "Direct" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Programme" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Soirées" })).toBeVisible();
  await expect(page.locator("main")).toBeVisible();

  expect(errors).toEqual([]);
});

test("programme page renders", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("/programme");
  await expect(page.getByRole("link", { name: "Direct" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("soirees page renders", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("/soirees");
  await expect(page.getByRole("link", { name: "Programme" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("about and soutiens pages render", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("/about");
  await expect(page.locator("h1")).toBeVisible();
  await page.goto("/soutiens");
  await expect(page.locator("main, h1").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("movie page mounts the player", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("/movie");
  await expect(page.locator("video")).toBeAttached();
  expect(errors).toEqual([]);
});

test("keyboard shortcuts overlay toggles with ? and Escape", async ({ page }) => {
  await page.goto("/movie");
  await expect(page.locator("video")).toBeAttached();

  await page.keyboard.press("?");
  const dialog = page.getByRole("dialog", { name: "Raccourcis clavier" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Plein écran")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("unknown route shows the styled 404", async ({ page }) => {
  await page.goto("/pas-une-vraie-page");
  await expect(page.getByText("Séance introuvable")).toBeVisible();
});
