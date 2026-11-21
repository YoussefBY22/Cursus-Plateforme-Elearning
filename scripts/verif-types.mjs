/**
 * Vérifie les types de quelques fichiers, pas de tout le projet.
 *
 * `tsc --noEmit` suit le `include` du tsconfig, qui couvre le projet entier :
 * chaque vérification analysait donc les 106 modèles Mongoose, ce qui finit
 * par ne plus tenir en mémoire. Or TypeScript tire automatiquement les
 * dépendances des fichiers qu'on lui donne : vérifier une page de trésorerie
 * charge les modèles de trésorerie, pas ceux du marketing.
 *
 * Ce que ça ne voit pas : un fichier *ailleurs* qui appelait ce qu'on vient
 * de changer. Passer ses chemins en argument aussi, ou lancer la
 * vérification complète (`npm run typecheck`) avant une livraison.
 *
 * Usage : node scripts/verif-types.mjs src/a.ts src/b.tsx …
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

/**
 * Déclarations d'ambiance : personne ne les importe, mais tout en dépend.
 * Sans elles, `session.user.roles` « n'existe pas » et la vérification
 * signale des erreurs qui n'en sont pas.
 */
function declarationsGlobales(racine) {
  const chemins = [join(racine, "next-env.d.ts")];
  const types = join(racine, "src", "types");
  if (existsSync(types)) {
    for (const f of readdirSync(types)) {
      if (f.endsWith(".d.ts") || f.endsWith(".ts")) chemins.push(join(types, f));
    }
  }
  return chemins.filter((c) => existsSync(c));
}

const fichiers = process.argv.slice(2);
if (fichiers.length === 0) {
  console.error("Usage : node scripts/verif-types.mjs <fichiers…>");
  process.exit(1);
}

const racine = process.cwd();
const dossier = mkdtempSync(join(tmpdir(), "verif-types-"));
const config = join(dossier, "tsconfig.json");

writeFileSync(
  config,
  JSON.stringify(
    {
      extends: resolve(racine, "tsconfig.json"),
      compilerOptions: {
        // Le cache incrémental du projet complet ne vaut rien ici, et
        // l'écraser priverait `npm run typecheck` du sien.
        incremental: false,
        baseUrl: racine,
        paths: { "@/*": [join(racine, "src", "*")] },
      },
      include: [],
      files: [
        ...declarationsGlobales(racine),
        ...fichiers.map((f) => resolve(racine, f)),
      ],
    },
    null,
    2
  )
);

const enfant = spawn(`npx tsc --noEmit --project "${config}"`, {
  stdio: "inherit",
  shell: true,
});

enfant.on("exit", (code) => {
  rmSync(dossier, { recursive: true, force: true });
  const relatifs = fichiers.map((f) => relative(racine, resolve(racine, f)));
  if (code === 0) console.log(`✅ Types vérifiés : ${relatifs.join(", ")}`);
  process.exit(code ?? 1);
});
