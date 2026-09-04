import { test, expect, type Page } from "@playwright/test";

function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

const ADMIN_ROUTES = [
  "/admin/dashboard",
  "/admin/users",
  "/admin/chat",
  "/admin/suggestions",
  "/admin/bugs",
  "/admin/emotes",
  "/admin/staff",
  "/admin/errors",
];

for (const route of ADMIN_ROUTES) {
  test(`${route} affiche un écran d'accès refusé pour un visiteur anonyme`, async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto(route);

    await expect(page.getByText("★ Accès refusé")).toBeVisible();
    await expect(page.getByRole("link", { name: "RETOUR", exact: true })).toBeVisible();

    expect(errors).toEqual([]);
  });
}

test("la page users n'expose aucune donnée de membre à un visiteur anonyme", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("/admin/users");

  await expect(page.getByText("★ Accès refusé")).toBeVisible();
  await expect(page.getByPlaceholder("Chercher un pseudo…")).not.toBeAttached();
  await expect(page.getByRole("table")).not.toBeAttached();

  expect(errors).toEqual([]);
});

test("la page dashboard n'expose aucune métrique interne à un visiteur anonyme", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("/admin/dashboard");

  await expect(page.getByText("★ Accès refusé")).toBeVisible();
  await expect(page.getByText("Membres")).not.toBeAttached();
  await expect(page.getByText("Antenne cumulée")).not.toBeAttached();

  expect(errors).toEqual([]);
});

test("la page chat admin n'expose aucun outil de modération à un visiteur anonyme", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("/admin/chat");

  await expect(page.getByText("★ Accès refusé")).toBeVisible();
  await expect(page.getByText("Réservé à la modération")).toBeVisible();

  expect(errors).toEqual([]);
});
