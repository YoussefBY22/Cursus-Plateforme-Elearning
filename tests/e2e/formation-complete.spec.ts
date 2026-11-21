import { expect, test, type Page } from "@playwright/test";
import { COMPTES, seConnecter } from "./aides";
import { corriges, fermerBase, nbGains, reinitialiserFormation, statutProgression, type Corrige } from "./base";

/**
 * Le parcours qui fait le produit, de bout en bout : regarder réellement la
 * vidéo, franchir le quiz bloquant, réussir le quiz final, remplir l'enquête,
 * et vérifier que la formation bascule en « terminée » avec des gains de
 * compétence écrits en base.
 *
 * Il tourne sur une capsule locale de 56 s : YouTube n'est pas joignable
 * depuis l'intégration continue, et seul un fichier permet de regarder la
 * vidéo pour de vrai. Et il faut la regarder pour de vrai : le serveur ne
 * compte que le temps réellement écoulé, donc aucun raccourci n'est possible.
 */

const SLUG = "la-cloture-mensuelle";

test.describe("parcours complet d'une formation", () => {
  test.afterAll(fermerBase);

  test("de la première lecture à la formation validée", async ({ page }) => {
    // 56 s de vidéo à vitesse double, plus les quiz et les synchronisations.
    test.setTimeout(240_000);

    await reinitialiserFormation(COMPTES.membre, SLUG);
    const table = await corriges(SLUG);
    expect(table.size, "la formation de test doit avoir des questions").toBeGreaterThan(0);

    await seConnecter(page, COMPTES.membre);
    await page.goto(`/formations/${SLUG}/lecture`);

    // --- 1. la vidéo démarre, et seul le temps réel comptera ----------------
    await page.getByRole("button", { name: "Lancer la lecture" }).click();
    await expect(page.locator("video")).toHaveJSProperty("paused", false);
    // Vitesse double : c'est le maximum qui donne encore droit au visionnage.
    await page.getByLabel("Vitesse de lecture").selectOption("2");

    // --- 2. le quiz bloquant arrête la lecture ------------------------------
    await expect(page.getByText("on vérifie avant de continuer")).toBeVisible({ timeout: 120_000 });
    await expect(page.locator("video")).toHaveJSProperty("paused", true);
    await repondre(page, table);
    await expect(page.getByText(/bonne réponse sur|bonnes réponses sur/)).toBeVisible();
    await page.getByRole("button", { name: "Reprendre la vidéo" }).click();

    // La lecture repart d'elle-même après un quiz intégré.
    await expect(page.locator("video")).toHaveJSProperty("paused", false, { timeout: 15_000 });

    // --- 3. le seuil de visionnage ouvre le quiz final ----------------------
    const quizFinal = page.getByRole("button", { name: "Passer le quiz final" });
    await expect(quizFinal).toBeVisible({ timeout: 150_000 });
    await quizFinal.click();
    await repondre(page, table);
    await expect(page.getByText("Quiz final réussi")).toBeVisible();
    await page.getByRole("button", { name: "Continuer", exact: true }).click();

    // --- 4. l'enquête de satisfaction, dernière étape -----------------------
    await page.getByRole("button", { name: "Remplir l'enquête" }).click();
    await expect(page.getByRole("heading", { name: /^Votre retour sur/ })).toBeVisible();

    for (const bouton of await page.getByRole("button", { name: "4 sur 5" }).all()) await bouton.click();
    await page.getByRole("button", { name: "9", exact: true }).click();
    for (const bouton of await page.getByRole("button", { name: /: 7 sur 10$/ }).all()) await bouton.click();
    await expect(page.getByText("Tout est rempli.")).toBeVisible();
    await page.getByRole("button", { name: "Envoyer et terminer" }).click();

    // --- 5. la formation est validée, et la base le confirme ----------------
    await expect(page.getByText("Formation validée.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("link", { name: "Voir mes compétences" })).toBeVisible();

    const progression = await statutProgression(COMPTES.membre, SLUG);
    expect(progression?.statut).toBe("TERMINEE");
    expect(progression?.seuil_atteint).toBe(true);
    expect(await nbGains(COMPTES.membre, SLUG), "la formation doit créditer des compétences").toBeGreaterThan(0);
  });
});

/** Répond correctement à toutes les questions du panneau, puis valide. */
async function repondre(page: Page, table: Map<string, Corrige>) {
  for (;;) {
    const enonce = (await page.locator("fieldset legend").innerText()).trim();
    const corrige = table.get(enonce);
    if (!corrige) throw new Error(`Énoncé absent de la base : « ${enonce} »`);

    for (const texte of corrige.bonnes) {
      await page.getByText(texte, { exact: true }).click();
    }

    const suivante = page.getByRole("button", { name: "Question suivante" });
    if (await suivante.isVisible()) {
      await suivante.click();
      continue;
    }
    break;
  }
  await page.getByRole("button", { name: /^Valider (mes réponses|le quiz final)$/ }).click();
}
