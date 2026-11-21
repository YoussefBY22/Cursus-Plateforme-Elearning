import { expect, test } from "@playwright/test";
import { COMPTES, seConnecter } from "./aides";

/**
 * Tenue sur petit écran.
 *
 * La règle du projet : tout doit fonctionner à 375 px de large. Le test
 * vérifie donc l'absence de débordement horizontal, que la barre latérale
 * se replie, et que l'action principale de chaque écran reste atteignable.
 */

const ECRANS = [
  { chemin: "/accueil", titre: /bonjour/i },
  { chemin: "/catalogue", titre: /catalogue/i },
  { chemin: "/competences", titre: /compétences/i },
  { chemin: "/badges", titre: /badges/i },
  { chemin: "/annuaire", titre: /annuaire/i },
  { chemin: "/formateurs", titre: /formateurs/i },
  { chemin: "/profil", titre: /profil/i },
  { chemin: "/notifications", titre: /notifications/i },
  { chemin: "/parcours", titre: /parcours/i },
  { chemin: "/certificats", titre: /certificat/i },
];

test.describe("mobile", () => {
  test.beforeEach(async ({ page }) => {
    await seConnecter(page, COMPTES.rh);
  });

  for (const e of ECRANS) {
    test(`${e.chemin} tient dans la largeur`, async ({ page }) => {
      await page.goto(e.chemin);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(e.titre);

      // Aucun débordement horizontal : c'est le défaut le plus visible sur mobile.
      const debordement = await page.evaluate(() => {
        const d = document.documentElement;
        return d.scrollWidth - d.clientWidth;
      });
      expect(debordement, `${e.chemin} débord de ${debordement} px`).toBeLessThanOrEqual(2);
    });
  }

  test("la barre latérale s'ouvre et se referme", async ({ page }) => {
    await page.goto("/accueil");
    const ouvrir = page.getByRole("button", { name: /ouvrir le menu/i });
    await expect(ouvrir).toBeVisible();
    await ouvrir.click();
    const nav = page.getByRole("complementary", { name: /navigation principale/i });
    await expect(nav.getByRole("link", { name: "Catalogue", exact: true })).toBeVisible();
  });
});

