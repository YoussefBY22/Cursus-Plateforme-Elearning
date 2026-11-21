import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de bout en bout — npm run test:e2e
 *
 * Ils tournent contre le serveur de production (`npm run build` puis
 * `npm start`) : c'est le seul moyen de vérifier ce que verra vraiment un
 * membre, rendu serveur et actions comprises. La base doit être semée
 * (`npm run setup`), les tests s'appuyant sur les comptes de démonstration.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: process.env.URL_TEST ?? "http://127.0.0.1:3100",
    locale: "fr-FR",
    timezoneId: process.env.APP_TIMEZONE ?? "UTC",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "bureau", use: { ...devices["Desktop Chrome"] }, testIgnore: /responsive\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: {
    command: "npm start -- --port 3100",
    url: "http://127.0.0.1:3100/connexion",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Le port des tests n'est pas celui du développement : sans ces deux
      // variables, next-auth renvoie ses redirections vers localhost:3000 et
      // la connexion échoue silencieusement.
      AUTH_URL: process.env.URL_TEST ?? "http://127.0.0.1:3100",
      APP_URL: process.env.URL_TEST ?? "http://127.0.0.1:3100",
      AUTH_TRUST_HOST: "true",
      EMAIL_SILENCIEUX: "1",
      // La route de relance n'existe que si un secret est défini : sans lui,
      // le test ne pourrait pas distinguer « désactivée » de « cassée ».
      CRON_SECRET: "cron-de-test",
    },
  },
});
