/**
 * Régénère les captures d'écran du README : npm run captures
 *
 * Il faut une base fraîchement semée (`npm run db:reset`) et un build de
 * production (`npm run build`) : les captures sont prises sur le même serveur
 * que les tests de bout en bout.
 */
import { spawnSync } from "node:child_process";

const resultat = spawnSync("npx", ["playwright", "test", "captures.spec.ts", "--project=bureau"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, CAPTURES: "1" },
});
process.exit(resultat.status ?? 1);
