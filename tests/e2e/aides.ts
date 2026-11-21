import { expect, type Page } from "@playwright/test";

/** Comptes de démonstration semés par `npm run db:seed`. */
export const COMPTES = {
  admin: "admin@cursus.test",
  dc: "dc@cursus.test",
  formateur: "formateur@cursus.test",
  rh: "rh@aurora.test",
  suivi: "suivi@cursus.test",
  membre: "membre@cursus.test",
} as const;

export const MOT_DE_PASSE = "Cursus2026!";

/** Connexion par le vrai formulaire : c'est aussi un test du formulaire. */
export async function seConnecter(page: Page, email: string) {
  await page.goto("/connexion");
  // On cible les champs par leur identifiant : « Mot de passe » désigne
  // aussi le bouton « Afficher le mot de passe ».
  await page.locator("#email").fill(email);
  await page.locator("#motDePasse").fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: /se connecter/i }).click();
  await page.waitForURL(/\/accueil/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Bonjour");
}
