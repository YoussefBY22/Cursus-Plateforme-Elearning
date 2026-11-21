/**
 * Charge `.env` pour les scripts lancés hors de Next (migrations, seed).
 * Node ≥ 20.12 sait le faire nativement ; les variables déjà définies
 * dans l'environnement gardent la priorité.
 */
import { existsSync } from "node:fs";

for (const fichier of [".env.local", ".env"]) {
  if (existsSync(fichier)) {
    try {
      process.loadEnvFile(fichier);
    } catch {
      // Fichier illisible : on continue avec l'environnement courant.
    }
  }
}
