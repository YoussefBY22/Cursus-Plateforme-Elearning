import { mkdirSync } from "node:fs";
import path from "node:path";
import { test, type Page } from "@playwright/test";
import { COMPTES, seConnecter } from "./aides";
import { base, fermerBase } from "./base";

/**
 * Captures d'écran du README — npm run captures
 *
 * Ce n'est pas un test : il ne s'exécute que lorsque CAPTURES=1 (ce que fait
 * `npm run captures`). Il parcourt l'application avec chaque rôle et
 * enregistre les écrans dans docs/captures. La base doit être fraîchement
 * semée (`npm run db:reset`) pour que les dates et les chiffres soient frais.
 */

const DOSSIER = path.resolve(__dirname, "../../docs/captures");
test.skip(!process.env.CAPTURES, "Réservé à `npm run captures`.");
test.beforeAll(() => mkdirSync(DOSSIER, { recursive: true }));
test.afterAll(fermerBase);

async function photo(page: Page, nom: string, options: { pleinePage?: boolean } = {}) {
  // Laisse les graphiques et les polices finir de se dessiner.
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  // Les notifications flottantes (badge débloqué…) masqueraient un coin de l'écran.
  for (const b of await page.getByRole("button", { name: "Fermer la notification" }).all()) await b.click().catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(DOSSIER, `${nom}.png`), fullPage: options.pleinePage ?? false, animations: "disabled" });
}

/** Une carte, retrouvée par son titre, photographiée seule. */
async function photoCarte(page: Page, titre: RegExp, nom: string) {
  const carte = page.getByRole("heading", { name: titre }).first().locator("xpath=ancestor::*[contains(@class,'rounded-2xl')][1]");
  await carte.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await carte.screenshot({ path: path.join(DOSSIER, `${nom}.png`), animations: "disabled" });
}

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });

test.describe("captures — clair", () => {
  test("connexion", async ({ page }) => {
    await page.goto("/connexion");
    await photo(page, "01-connexion");
  });

  test("espace membre", async ({ page }) => {
    test.setTimeout(120_000);
    await seConnecter(page, COMPTES.membre);
    // La célébration d'un badge ouvre une fenêtre : on la ferme pour voir l'accueil.
    await page.getByRole("button", { name: "Continuer" }).click({ timeout: 4000 }).catch(() => {});
    await photo(page, "02-accueil");

    await page.goto("/catalogue");
    await photo(page, "03-catalogue");

    await page.goto("/competences");
    await photo(page, "04-competences");

    await page.goto("/badges");
    await photo(page, "05-badges");

    await page.goto("/demandes");
    await photo(page, "06-demandes");

    // Le lecteur : une capsule locale, quelques secondes de lecture.
    await page.goto("/formations/tenir-sa-caisse-au-jour-le-jour/lecture");
    await page.getByRole("button", { name: "Lancer la lecture" }).click();
    await page.waitForTimeout(9000);
    await page.evaluate(() => (document.querySelector("video") as HTMLVideoElement | null)?.pause());
    await photo(page, "07-lecteur");
  });

  test("certificat public", async ({ page }) => {
    const [c] = await base()<{ jeton: string }[]>`select jeton from certificat where revoque_le is null order by emis_le limit 1`;
    if (!c) test.skip(true, "Aucun certificat dans le semis.");
    await page.goto(`/v/${c.jeton}`);
    await photo(page, "08-certificat-public");
  });

  test("espace formateur", async ({ page }) => {
    await seConnecter(page, COMPTES.formateur);
    await page.goto("/studio");
    await photo(page, "09-studio");

    await page.getByText("Les 8 secrets du succès").first().click();
    await page.waitForURL(/\/studio\/formations\//);
    await page.getByRole("tab", { name: "Vidéo et quiz" }).click();
    await photo(page, "10-editeur-quiz");
  });

  test("espace de l'organisation", async ({ page }) => {
    await seConnecter(page, COMPTES.rh);
    await page.goto("/mon-organisation");
    await photo(page, "11-organisation-membres");

    await page.goto("/mon-organisation?onglet=formations");
    await photo(page, "12-organisation-formations-internes");
  });

  test("pilotage et suivi", async ({ page }) => {
    test.setTimeout(120_000);
    await seConnecter(page, COMPTES.dc);
    await page.getByRole("button", { name: "Continuer" }).click({ timeout: 3000 }).catch(() => {});

    await page.goto("/admin");
    await photo(page, "13-pilotage");
    await photoCarte(page, /Niveau moyen par domaine et par organisation/, "14-carte-chaleur");

    await page.goto("/admin/suivi");
    await photo(page, "15-suivi");

    await page.getByText("Cap Horizon Services").first().click();
    await page.waitForURL(/\/admin\/suivi\//);
    await photo(page, "16-suivi-fiche", { pleinePage: true });

    await page.goto("/admin/validations");
    await page.getByRole("button", { name: /examiner/i }).first().click();
    await page.waitForTimeout(800);
    // On descend jusqu'aux objectifs, aux compétences visées et aux questions :
    // c'est ce qui permet de décider, et la miniature d'une vidéo tierce n'a
    // pas sa place dans une capture publiée.
    await page.getByText("Objectifs annoncés").first().evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.mouse.wheel(0, -76); // sous l'en-tête fixe, sans remonter sur la vidéo
    await page.waitForTimeout(400);
    await photo(page, "17-validation");

    await page.goto("/admin/badges/nouveau");
    await photo(page, "18-editeur-badge");

    const [m] = await base()<{ id: string }[]>`select id from modele_certificat order by cree_le limit 1`;
    if (m) {
      await page.goto(`/admin/certificats/modeles/${m.id}`);
      await photo(page, "19-modele-certificat");
    }
  });
});

test.describe("captures — sombre et mobile", () => {
  test.use({ colorScheme: "dark" });
  test("thème sombre", async ({ page }) => {
    await seConnecter(page, COMPTES.membre);
    await page.getByRole("button", { name: "Continuer" }).click({ timeout: 4000 }).catch(() => {});
    await page.goto("/competences");
    await photo(page, "20-competences-sombre");
  });
});

test.describe("captures — mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  test("accueil mobile", async ({ page }) => {
    await seConnecter(page, COMPTES.membre);
    await page.getByRole("button", { name: "Continuer" }).click({ timeout: 4000 }).catch(() => {});
    await photo(page, "21-mobile-accueil");
    await page.goto("/catalogue");
    await photo(page, "22-mobile-catalogue");
  });
});
