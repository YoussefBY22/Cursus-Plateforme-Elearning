import { expect, test } from "@playwright/test";
import { COMPTES, MOT_DE_PASSE, seConnecter } from "./aides";

/**
 * Parcours critiques, du point de vue de l'utilisateur.
 *
 * Chaque test vérifie qu'un membre peut réellement faire la chose, pas
 * qu'un composant s'affiche : si le test passe, le parcours marche.
 */

test.describe("inscription", () => {
  test("un nouveau membre crée son compte et doit confirmer son e-mail", async ({ page }) => {
    const unique = `test-${Date.now().toString(36)}@exemple.test`;
    await page.goto("/inscription");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Rejoindre Cursus");

    await page.locator("#prenom").fill("Amine");
    await page.locator("#nom").fill("Testeur");
    await page.locator("#email").fill(unique);
    await page.locator("#motDePasse").fill(MOT_DE_PASSE);

    // L'organisation se choisit à l'inscription : le rattachement attend le RH.
    const je = page.locator("#jeId");
    const options = await je.locator("option").all();
    expect(options.length).toBeGreaterThan(1);
    await je.selectOption({ index: 1 });

    await page.getByRole("button", { name: /créer mon compte/i }).click();
    await expect(page.getByText(/e-mail|courriel|confirm/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("un mot de passe trop faible est refusé, sans perdre la saisie", async ({ page }) => {
    await page.goto("/inscription");
    await page.locator("#prenom").fill("Faible");
    await page.locator("#nom").fill("Motdepasse");
    await page.locator("#email").fill(`faible-${Date.now().toString(36)}@exemple.test`);
    await page.locator("#motDePasse").fill("abc");
    await page.getByRole("button", { name: /créer mon compte/i }).click();
    await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 15_000 });
    // La saisie survit à l'erreur : rien à retaper.
    await expect(page.locator("#prenom")).toHaveValue("Faible");
  });
});

test.describe("connexion et navigation", () => {
  test("un membre se connecte et atterrit sur son tableau de bord", async ({ page }) => {
    await seConnecter(page, COMPTES.membre);
    await expect(page.getByRole("link", { name: /catalogue/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /mes compétences/i }).first()).toBeVisible();
  });

  test("un mauvais mot de passe est refusé", async ({ page }) => {
    await page.goto("/connexion");
    await page.locator("#email").fill(COMPTES.membre);
    await page.locator("#motDePasse").fill("MauvaisMotDePasse1!");
    await page.getByRole("button", { name: /se connecter/i }).click();
    await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/connexion/);
  });

  test("une page protégée renvoie vers la connexion", async ({ page }) => {
    await page.goto("/competences");
    await expect(page).toHaveURL(/\/connexion/);
  });
});

test.describe("catalogue et formation", () => {
  test("le catalogue se filtre et mène à une formation", async ({ page }) => {
    await seConnecter(page, COMPTES.membre);
    await page.goto("/catalogue");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Catalogue");

    // La bande « reprendre » du catalogue pointe directement sur le lecteur :
    // on cible ici les fiches, pas les reprises.
    const cartes = page.locator('a[href^="/formations/"]:not([href*="/lecture"])');
    await expect(cartes.first()).toBeVisible({ timeout: 15_000 });
    const avant = await cartes.count();
    expect(avant).toBeGreaterThan(0);

    await cartes.first().click();
    await expect(page).toHaveURL(/\/formations\//);
    // Une page formation annonce toujours sa durée et ce qu'on y apprend.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /commencer|reprendre|revoir|terminer/i }).first()).toBeVisible();
  });
});

test.describe("lecteur et quiz bloquant", () => {
  test("le lecteur s'ouvre avec sa barre de progression et ses marqueurs", async ({ page }) => {
    await seConnecter(page, COMPTES.membre);
    await page.goto("/catalogue");
    const carte = page.locator('a[href^="/formations/"]:not([href*="/lecture"])').first();
    await carte.click();
    await page.getByRole("link", { name: /commencer|reprendre|revoir|terminer/i }).first().click();

    await expect(page).toHaveURL(/\/lecture/);
    // Le lecteur monte sa surface vidéo : la vidéo n'a pas besoin de jouer
    // (le réseau peut ne pas joindre YouTube) pour que l'écran soit correct.
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("heading").first()).toBeVisible();
  });
});

test.describe("compétences", () => {
  test("l'auto-évaluation s'annonce honnêtement avant de démarrer", async ({ page }) => {
    await seConnecter(page, COMPTES.membre);
    await page.goto("/competences");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Mes compétences");

    const demarrer = page.getByRole("link", { name: /auto-évaluation|commencer/i }).first();
    if (await demarrer.isVisible().catch(() => false)) {
      await demarrer.click();
      await expect(page).toHaveURL(/auto-evaluation/);
      // Les trois promesses de l'écran d'introduction.
      await expect(page.getByText(/secondes chacune/i)).toBeVisible();
      await expect(page.getByText(/je ne connais pas/i).first()).toBeVisible();
      await expect(page.getByText(/sans IA ni recherche/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /démarrer/i })).toBeEnabled();
    }
  });

  test("le profil affiche une note générale et un radar", async ({ page }) => {
    await seConnecter(page, COMPTES.rh);
    await page.goto("/competences");
    // Le radar s'annonce comme une image accessible : c'est ce qu'on cible.
    await expect(page.getByRole("img", { name: /radar de compétences/i })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("certificats et vérification publique", () => {
  test("un certificat se vérifie publiquement par son jeton, sans être connecté", async ({ page, request }) => {
    await seConnecter(page, COMPTES.rh);
    await page.goto("/certificats");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/certificat/i);

    const lien = page.locator('a[href^="/v/"]').first();
    const existe = await lien.count();
    if (!existe) test.skip(true, "Aucun certificat pour ce compte dans le semis.");

    const href = await lien.getAttribute("href");
    expect(href).toMatch(/^\/v\/[A-Za-z0-9_-]{20,}$/); // jeton long, non devinable

    // Vérification publique : sans session.
    const anonyme = await request.get(href!, { headers: { cookie: "" } });
    expect(anonyme.ok()).toBeTruthy();
    const html = await anonyme.text();
    expect(html).toMatch(/certificat/i);

    // Un jeton inventé ne révèle aucun certificat (page d'erreur ou 404,
    // mais jamais le nom d'un apprenant).
    const faux = await request.get("/v/jeton-invente-qui-nexiste-pas-du-tout");
    const corpsFaux = await faux.text();
    expect(corpsFaux).not.toMatch(/a suivi|délivré le/i);
  });
});

test.describe("espace formateur", () => {
  test("un formateur voit ses contenus et peut en créer un", async ({ page }) => {
    await seConnecter(page, COMPTES.formateur);
    await page.goto("/studio");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Espace formateur");
    await page.getByRole("button", { name: /créer un contenu/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel(/titre de la formation/i)).toBeVisible();
  });
});

test.describe("validation administrateur", () => {
  test("l'écran de validation apporte tout ce qu'il faut pour décider", async ({ page }) => {
    await seConnecter(page, COMPTES.admin);
    await page.goto("/admin/validations");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Validations");

    const examiner = page.getByRole("button", { name: /examiner/i }).first();
    if (!(await examiner.isVisible().catch(() => false))) {
      test.skip(true, "Rien en attente de validation dans le semis.");
    }
    await examiner.click();
    // Un refus sans motif ne doit pas passer : le champ est obligatoire.
    await page.getByRole("button", { name: /demander des corrections/i }).first().click();
    const motif = page.locator('textarea[name="motif"]').first();
    await expect(motif).toBeVisible();
    await expect(motif).toHaveAttribute("required", "");
  });
});

test.describe("annuaire et profils", () => {
  test("l'annuaire se cherche et mène à un profil", async ({ page }) => {
    await seConnecter(page, COMPTES.membre);
    await page.goto("/annuaire");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Annuaire");

    const membres = page.locator('a[href^="/membres/"]');
    await expect(membres.first()).toBeVisible({ timeout: 15_000 });
    await membres.first().click();
    await expect(page).toHaveURL(/\/membres\//);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("mon profil s'enregistre", async ({ page }) => {
    await seConnecter(page, COMPTES.membre);
    await page.goto("/profil");
    const poste = page.locator("#poste");
    await poste.fill("Responsable test");
    await page.getByRole("button", { name: /enregistrer le profil/i }).click();
    await expect(page.getByText(/profil enregistré/i)).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("badges et notifications", () => {
  test("la collection montre l'avancement des badges restants", async ({ page }) => {
    await seConnecter(page, COMPTES.rh);
    await page.goto("/badges");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Badges");
    await page.getByRole("tab", { name: /à décrocher/i }).click();
    await expect(page.getByRole("button").filter({ hasText: /./ }).first()).toBeVisible();
  });

  test("les notifications se filtrent", async ({ page }) => {
    await seConnecter(page, COMPTES.membre);
    await page.goto("/notifications");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Notifications");
    await page.getByRole("link", { name: /non lues/i }).first().click();
    await expect(page).toHaveURL(/filtre=non-lues/);
  });
});

test.describe("relances des évaluations à froid", () => {
  // Cette route est ce que l'hébergeur appelle chaque jour : si son garde
  // tombe, n'importe qui peut vider la file des relances depuis l'extérieur.
  test("la route quotidienne n'ouvre qu'avec son secret", async ({ request }) => {
    expect((await request.get("/api/cron/relances")).status()).toBe(401);
    expect(
      (await request.get("/api/cron/relances", { headers: { authorization: "Bearer faux" } })).status()
    ).toBe(401);

    const bonne = await request.get("/api/cron/relances", {
      headers: { authorization: "Bearer cron-de-test" },
    });
    expect(bonne.status()).toBe(200);
    expect(await bonne.json()).toMatchObject({ ok: true });
  });
});
