
/**
 * Envoi d'e-mails — Resend en REST, sans SDK.
 * Sans RESEND_API_KEY, les e-mails s'affichent dans la console : pratique en
 * développement. Ne lève jamais : un échec d'e-mail ne casse pas l'action.
 */

const NUIT = "#0f1226";
const ACCENT = "#4f46e5";

function echapper(texte: string): string {
  return texte.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function urlApp(chemin = ""): string {
  const base = (process.env.APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${chemin}`;
}

export function gabaritEmail(titre: string, corps: string, lien?: { url: string; libelle: string }) {
  return `<!doctype html>
<html lang="fr"><body style="margin:0;background:#f4f5fa;font-family:Montserrat,Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #d9dbea">
    <div style="background:${NUIT};padding:18px 24px">
      <p style="margin:0;color:#ffffff;font-size:17px;font-weight:800;letter-spacing:-0.01em">Cursus</p>
    </div>
    <div style="padding:28px 24px">
      <h1 style="margin:0 0 12px;font-size:20px;color:${NUIT};font-weight:800">${echapper(titre)}</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#484d70;line-height:1.6">${echapper(corps)}</p>
      ${lien ? `<a href="${lien.url}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:700">${echapper(lien.libelle)}</a>` : ""}
    </div>
    <div style="padding:14px 24px;border-top:1px solid #e9eaf4">
      <p style="margin:0;font-size:11px;color:#8087b8">Cursus</p>
    </div>
  </div>
</body></html>`;
}

export async function envoyerEmail(options: { a: string; sujet: string; html: string }): Promise<void> {
  const cle = process.env.RESEND_API_KEY;
  const de = process.env.EMAIL_FROM ?? "Cursus <academy@exemple.test>";
  if (process.env.EMAIL_SILENCIEUX === "1") return;
  if (!cle) {
    const lien = options.html.match(/href="([^"]+)"/)?.[1];
    console.info(`[email] (transport désactivé) À : ${options.a} — ${options.sujet}${lien ? ` — ${lien}` : ""}`);
    return;
  }
  try {
    const reponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: de, to: [options.a], subject: options.sujet, html: options.html }),
    });
    if (!reponse.ok) console.error(`[email] Échec Resend (${reponse.status}) :`, await reponse.text());
  } catch (err) {
    console.error("[email] Erreur d'envoi :", err);
  }
}
