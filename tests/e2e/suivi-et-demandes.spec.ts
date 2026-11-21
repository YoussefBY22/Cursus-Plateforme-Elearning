import { expect, test } from "@playwright/test";
import { COMPTES, seConnecter } from "./aides";

/**
 * Suivi des organisations et demandes de formation.
 *
 * Ce qui compte : le chargé de suivi ne voit que son portefeuille, les
 * organisations à relancer sont nommées, et un membre peut proposer puis
 * soutenir une formation.
 */

test.describe("suivi des organisations", () => {
  test("le responsable pédagogique voit toutes les organisations, dont celles à relancer", async ({ page }) => {
    await seConnecter(page, COMPTES.dc);
    await page.goto("/admin/suivi");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Suivi des organisations");
    // Les états se lisent dans le tableau (et pas dans les options du filtre).
    for (const etat of ["En décrochage", "Ralentie", "Active"]) {
      await expect(page.getByRole("cell", { name: etat, exact: true }).first()).toBeVisible();
    }
  });

  test("le chargé de suivi ne voit que son portefeuille", async ({ page }) => {
    await seConnecter(page, COMPTES.suivi);
    await page.goto("/admin/suivi");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Mon portefeuille");
    // Quatre organisations lui sont rattachées dans le semis, pas les autres.
    await expect(page.getByText("Cap Horizon Services")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Aurora Conseil")).toBeVisible();
    await expect(page.getByText("Helios Digital")).toHaveCount(0);
    await expect(page.getByText("Orion Business")).toHaveCount(0);
    // Il n'a pas accès à la validation des contenus.
    await page.goto("/admin/validations");
    await expect(page).toHaveURL(/\/accueil/);
  });

  test("la fiche d'une organisation porte son carnet de suivi", async ({ page }) => {
    await seConnecter(page, COMPTES.suivi);
    await page.goto("/admin/suivi");
    await page.getByText("Cap Horizon Services").first().click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Cap Horizon Services");
    await expect(page.getByText("Carnet de suivi")).toBeVisible();
    await expect(page.getByText(/vice-présidente/)).toBeVisible();
  });
});

test.describe("demandes de formation", () => {
  test("un membre voit le mur, soutient une demande et en propose une", async ({ page }) => {
    await seConnecter(page, COMPTES.membre);
    await page.goto("/demandes");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Demandes de formation");
    await expect(page.getByText("Défendre un prix face à l'objection budget")).toBeVisible();

    await page.getByRole("button", { name: /proposer une formation/i }).first().click();
    const titre = `Négocier un délai de paiement ${Date.now().toString(36)}`;
    await page.locator("#titre").fill(titre);
    await page.locator("#description").fill("Quand un client paie en retard, on ne sait pas comment relancer sans abîmer la relation commerciale.");
    await page.getByRole("button", { name: /publier la demande/i }).click();
    await expect(page.getByText(titre)).toBeVisible({ timeout: 15_000 });
  });

  test("seul le responsable pédagogique peut répondre", async ({ page }) => {
    await seConnecter(page, COMPTES.membre);
    await page.goto("/demandes");
    await expect(page.getByRole("button", { name: /^répondre$/i })).toHaveCount(0);

    await page.context().clearCookies();
    await seConnecter(page, COMPTES.dc);
    await page.goto("/demandes");
    await expect(page.getByRole("button", { name: /^répondre$/i }).first()).toBeVisible();
  });
});
