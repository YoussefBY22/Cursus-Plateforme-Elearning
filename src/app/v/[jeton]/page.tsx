import type { Metadata } from "next";
import { Download, Info } from "lucide-react";
import { BoutonCopierLien } from "@/components/certificats/bouton-copier-lien";
import { RenduCertificat } from "@/components/certificats/rendu-certificat";
import { BandeauStatut, Fiche, LienInvalide, MiseEnPageVerification, TropDeTentatives } from "@/components/certificats/verification";
import { classesBouton } from "@/components/ui/bouton";
import { ipDeLaPage, limiterVerification } from "@/server/limiteur";
import { lienVerification } from "@/server/moteur/certificats";
import { certificatParJeton, compterConsultation, qrSvg } from "@/server/requetes/certificats";
import { jetonValide, statutCertificat } from "@/services/certificats/verification";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vérification de certificat",
  description: "Vérifiez l'authenticité d'un certificat délivré par Cursus.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

const FUSEAU = process.env.APP_TIMEZONE ?? "UTC";
const dateLongue = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: FUSEAU });

export default async function PageVerification({ params }: PageProps<"/v/[jeton]">) {
  // La limite s'applique à toute requête, jeton valide ou non : c'est
  // l'énumération qu'elle doit freiner.
  const decision = limiterVerification(await ipDeLaPage());
  if (!decision.autorise) {
    return (
      <MiseEnPageVerification>
        <TropDeTentatives minutes={Math.max(1, Math.ceil(decision.reessayerDansMs / 60000))} />
      </MiseEnPageVerification>
    );
  }

  const { jeton } = await params;
  const c = jetonValide(jeton) ? await certificatParJeton(jeton) : null;
  if (!c) {
    return (
      <MiseEnPageVerification>
        <LienInvalide />
      </MiseEnPageVerification>
    );
  }

  await compterConsultation(c.id);
  const lien = lienVerification(c.jeton);
  const qr = await qrSvg(lien);
  const statut = statutCertificat(c);
  const d = c.donnees;
  const delivreLe = d.dateObtention || dateLongue(c.emisLe);
  const maintenant = new Date().toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: FUSEAU });

  return (
    <MiseEnPageVerification>
      {statut === "VALIDE" ? (
        <BandeauStatut statut="VALIDE" titre="Certificat authentique" numero={c.numero}>
          Délivré à <strong className="font-bold text-foreground">{d.apprenant}</strong> pour le parcours certifiant{" "}
          <strong className="font-bold text-foreground">{d.parcours}</strong>, le {delivreLe}, par Cursus.
        </BandeauStatut>
      ) : (
        <BandeauStatut statut="REVOQUE" titre="Certificat révoqué" numero={c.numero}>
          Ce certificat n&apos;est plus valable depuis le {c.revoqueLe ? dateLongue(c.revoqueLe) : "—"}.
          {c.motifRevocation ? (
            <>
              {" "}
              Motif : <strong className="font-bold text-foreground">{c.motifRevocation}</strong>
            </>
          ) : null}
          <span className="mt-1 block text-sm text-muted-foreground">
            Il avait été délivré à {d.apprenant} pour le parcours « {d.parcours} » le {delivreLe}.
          </span>
        </BandeauStatut>
      )}

      <figure className="anim-apparition mt-6 sm:mt-8" style={{ animationDelay: "80ms" }}>
        <div className="rounded-[28px] bg-nuit p-3 sm:p-6 lg:p-10">
          <RenduCertificat
            canevas={c.canevas}
            couleurTheme={c.couleurTheme}
            donnees={d}
            qrSvg={qr}
            filigrane={statut === "REVOQUE" ? "Révoqué" : undefined}
            libelle={`Certificat ${c.numero} : ${d.parcours}, délivré à ${d.apprenant} le ${delivreLe}`}
            className="mx-auto max-w-[1080px] rounded-[3px] shadow-[0_30px_60px_-24px_rgb(0_0_0/0.6)]"
          />
        </div>
        <figcaption className="sr-only">
          Reproduction du certificat {c.numero} telle qu&apos;enregistrée par Cursus.
        </figcaption>
      </figure>

      <div className="mt-6 grid gap-4 sm:mt-8">
        <Fiche
          elements={[
            { libelle: "Titulaire", valeur: d.apprenant },
            { libelle: "Parcours certifiant", valeur: d.parcours },
            { libelle: "Délivré le", valeur: delivreLe },
            { libelle: "Volume de formation", valeur: d.heures || "—" },
            { libelle: "Organisation", valeur: d.je || "—" },
            { libelle: "Domaine", valeur: d.domaine || "—" },
            {
              libelle: "Émetteur",
              valeur: (
                <>Cursus</>
              ),
              large: true,
            },
          ]}
        />

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted-foreground sm:max-w-xl">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-turquoise" aria-hidden />
            <span>
              Cette page fait foi. Si le document qu&apos;on vous présente diffère (nom, parcours, numéro), il a été modifié.
              Vérification effectuée le {maintenant}.
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <BoutonCopierLien lien={lien} libelle="Copier le lien" variante="contour" />
            <a href={`/v/${c.jeton}/pdf`} className={classesBouton(statut === "VALIDE" ? "primaire" : "contour")}>
              <Download className="h-4 w-4" aria-hidden /> Télécharger le PDF
            </a>
          </div>
        </div>
      </div>
    </MiseEnPageVerification>
  );
}
