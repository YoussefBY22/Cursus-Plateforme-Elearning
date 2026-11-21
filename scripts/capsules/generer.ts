/**
 * Génère les capsules vidéo de démonstration — npm run capsules
 *
 * Chaque diapositive est rendue en image par Chromium (Playwright), puis
 * ffmpeg les assemble avec un fondu enchaîné et produit un MP4 et un WebM
 * dans public/videos. Le rendu est déterministe : la même source donne les
 * mêmes durées, à l'image près, ce qui garde les quiz calés sur la vidéo.
 *
 * Prérequis : ffmpeg dans le PATH (https://ffmpeg.org) et les navigateurs
 * Playwright (`npx playwright install chromium`).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { CAPSULES, type Capsule, type Diapositive } from "./contenu";

const RACINE = path.resolve(__dirname, "../..");
const SORTIE = path.join(RACINE, "public", "videos");
const POLICES = path.join(RACINE, "src", "server", "documents", "polices");
const LARGEUR = 1280;
const HAUTEUR = 720;
const FONDU = 0.6;
const IPS = 25;

const echapper = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function html(d: Diapositive, numero: number, total: number): string {
  const police = (poids: number, fichier: string) =>
    `@font-face{font-family:"Montserrat";font-weight:${poids};src:url("${pathToFileURL(path.join(POLICES, fichier)).href}")}`;
  const accueil = numero === 0;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
${police(400, "Montserrat-Regular.ttf")}${police(500, "Montserrat-Medium.ttf")}${police(600, "Montserrat-SemiBold.ttf")}${police(700, "Montserrat-Bold.ttf")}${police(900, "Montserrat-Black.ttf")}
*{box-sizing:border-box;margin:0}
body{width:${LARGEUR}px;height:${HAUTEUR}px;overflow:hidden;font-family:"Montserrat",sans-serif;color:#fff;
  background:radial-gradient(1100px 620px at 85% -10%,#2a3070 0%,transparent 60%),linear-gradient(160deg,#181c3a 0%,#0f1226 70%);
  display:flex;flex-direction:column;justify-content:center;padding:0 110px 0 96px;position:relative}
.barre{position:absolute;left:0;top:0;bottom:0;width:14px;background:#4f46e5}
.surtitre{font-size:26px;font-weight:600;color:#8f95d0;letter-spacing:.01em}
h1{font-size:${accueil ? 68 : 58}px;line-height:1.08;font-weight:${accueil ? 900 : 700};margin-top:16px;letter-spacing:-.025em;max-width:1000px}
.filet{width:64px;height:6px;border-radius:3px;background:#4f46e5;margin:30px 0 32px}
p{font-size:31px;line-height:1.6;font-weight:400;color:#c7cbe6;max-width:980px}
.etape{position:absolute;right:96px;top:70px;font-size:20px;font-weight:600;color:#6a70a8;letter-spacing:.08em}
.marque{position:absolute;right:96px;bottom:64px;display:flex;align-items:center;gap:12px;font-weight:800;font-size:26px;color:#fff;opacity:.85;letter-spacing:-.02em}
.points{position:absolute;left:96px;bottom:70px;display:flex;gap:10px}
.points i{width:10px;height:10px;border-radius:50%;background:#2a2f5e}
.points i.on{background:#4f46e5;width:30px;border-radius:6px}
</style></head><body>
<div class="barre"></div>
${accueil ? "" : `<div class="etape">${numero} / ${total - 1}</div>`}
<div class="surtitre">${echapper(d.surtitre)}</div>
<h1>${echapper(d.titre)}</h1>
<div class="filet"></div>
${d.texte ? `<p>${echapper(d.texte)}</p>` : ""}
<div class="points">${Array.from({ length: total }, (_, i) => `<i class="${i === numero ? "on" : ""}"></i>`).join("")}</div>
<div class="marque"><svg width="38" height="38" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#4f46e5"/><path d="M8 22.5h5v-5h5v-5h6" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="12.5" r="2.4" fill="#fff"/></svg>Cursus</div>
</body></html>`;
}

async function rendreImages(capsule: Capsule, dossier: string): Promise<string[]> {
  const navigateur = await chromium.launch();
  const page = await navigateur.newPage({ viewport: { width: LARGEUR, height: HAUTEUR } });
  const images: string[] = [];
  for (const [i, d] of capsule.diapositives.entries()) {
    const fichierHtml = path.join(dossier, `d${i}.html`);
    writeFileSync(fichierHtml, html(d, i, capsule.diapositives.length), "utf8");
    await page.goto(pathToFileURL(fichierHtml).href);
    await page.evaluate(() => document.fonts.ready);
    const png = path.join(dossier, `d${i}.png`);
    await page.screenshot({ path: png });
    images.push(png);
  }
  await navigateur.close();
  return images;
}

function ffmpeg(args: string[]) {
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });
}

function assembler(capsule: Capsule, images: string[], dossier: string) {
  const n = images.length;
  const durees = capsule.diapositives.map((d) => d.duree);
  const somme = durees.reduce((a, b) => a + b, 0);
  if (somme !== capsule.dureeSec) throw new Error(`${capsule.fichier} : ${somme} s au lieu de ${capsule.dureeSec} s.`);

  /* Chaque image dure sa part plus un fondu ; la dernière est prolongée pour le rognage final. */
  const entrees = images.flatMap((png, i) => ["-loop", "1", "-framerate", String(IPS), "-t", String(durees[i] + FONDU), "-i", png]);
  let filtre = "";
  let courant = "[0:v]";
  let debut = 0;
  for (let i = 1; i < n; i++) {
    debut += durees[i - 1];
    const sortie = i === n - 1 ? "[fin]" : `[x${i}]`;
    filtre += `${courant}[${i}:v]xfade=transition=fade:duration=${FONDU}:offset=${(debut - FONDU).toFixed(3)}${sortie};`;
    courant = sortie;
  }
  filtre += `[fin]format=yuv420p,trim=duration=${capsule.dureeSec},setpts=PTS-STARTPTS[v]`;

  const brut = path.join(dossier, "brut.mkv");
  ffmpeg([...entrees, "-filter_complex", filtre, "-map", "[v]", "-r", String(IPS), "-c:v", "libx264", "-crf", "12", "-an", brut]);

  mkdirSync(SORTIE, { recursive: true });
  ffmpeg(["-i", brut, "-c:v", "libx264", "-crf", "26", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", path.join(SORTIE, `${capsule.fichier}.mp4`)]);
  ffmpeg(["-i", brut, "-c:v", "libvpx-vp9", "-crf", "36", "-b:v", "0", "-row-mt", "1", "-an", path.join(SORTIE, `${capsule.fichier}.webm`)]);
}

async function main() {
  const filtre = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const cibles = filtre.length ? CAPSULES.filter((c) => filtre.includes(c.fichier)) : CAPSULES;
  if (!cibles.length) throw new Error(`Aucune capsule ne correspond à : ${filtre.join(", ")}`);
  for (const capsule of cibles) {
    const dossier = mkdtempSync(path.join(tmpdir(), "cursus-capsule-"));
    try {
      process.stdout.write(`… ${capsule.fichier} (${capsule.dureeSec} s)\n`);
      const images = await rendreImages(capsule, dossier);
      assembler(capsule, images, dossier);
    } finally {
      rmSync(dossier, { recursive: true, force: true });
    }
  }
  process.stdout.write(`✔ ${cibles.length} capsule(s) générée(s) dans public/videos\n`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
