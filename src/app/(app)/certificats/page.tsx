import { Download, ExternalLink, ScrollText } from "lucide-react";
import { BoutonCopierLien } from "@/components/certificats/bouton-copier-lien";
import { RenduCertificat } from "@/components/certificats/rendu-certificat";
import { classesBouton, LienBouton } from "@/components/ui/bouton";
import { EntetePage } from "@/components/ui/entete-page";
import { EtatVide } from "@/components/ui/etat-vide";
import { Pastille } from "@/components/ui/pastille";
import { formaterDate, pluriel } from "@/lib/utils";
import { mesCertificats } from "@/server/requetes/certificats";
import { exigerSession } from "@/server/session";
import { lienLinkedIn } from "@/services/certificats/verification";

export const metadata = { title: "Mes certificats" };

function LogoLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="currentColor">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

export default async function PageMesCertificats() {
  const u = await exigerSession();
  const liste = await mesCertificats(u.id);
  const valides = liste.filter((c) => !c.revoqueLe).length;

  return (
    <div>
      <EntetePage
        titre="Mes certificats"
        description={
          liste.length
            ? `${pluriel(valides, "certificat valide", "certificats valides")}. Chacun porte un QR code qui mène à sa page de vérification publique : partagez-le sans crainte.`
            : "Vos certificats de parcours, vérifiables par QR code et prêts à partager sur LinkedIn."
        }
      />

      {liste.length === 0 ? (
        <EtatVide
          icone={<ScrollText className="h-6 w-6" />}
          titre="Votre premier certificat vous attend"
          description="Terminez un parcours certifiant pour obtenir votre premier certificat, vérifiable par QR code et prêt à rejoindre votre profil LinkedIn."
          action={<LienBouton href="/parcours">Découvrir les parcours certifiants</LienBouton>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {liste.map((c, i) => {
            const revoque = !!c.revoqueLe;
            const parcours = c.donnees.parcours || c.parcoursTitre;
            return (
              <article
                key={c.id}
                className="anim-apparition flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
                style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}
              >
                <a
                  href={`/v/${c.jeton}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block bg-nuit p-4 sm:p-6"
                  aria-label={`Ouvrir la page de vérification du certificat ${c.numero}`}
                >
                  <RenduCertificat
                    canevas={c.canevas}
                    couleurTheme={c.couleurTheme}
                    donnees={c.donnees}
                    qrSvg={c.qr}
                    filigrane={revoque ? "Révoqué" : undefined}
                    libelle={`Certificat ${c.numero} : ${parcours}`}
                    className="rounded-[3px] shadow-[0_18px_40px_-20px_rgb(0_0_0/0.7)] transition-transform duration-300 ease-[var(--ease-sortie)] group-hover:-translate-y-0.5"
                  />
                </a>
                <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-[17px] font-bold leading-snug tracking-tight">{parcours}</h2>
                      <p className="chiffres mt-1 text-[13px] text-muted-foreground">
                        Délivré le {c.donnees.dateObtention || formaterDate(c.emisLe)} · <span className="font-mono">{c.numero}</span>
                      </p>
                    </div>
                    {revoque ? <Pastille ton="danger">Révoqué</Pastille> : <Pastille ton="succes">Valide</Pastille>}
                  </div>

                  {revoque ? (
                    <p className="rounded-xl bg-danger-soft px-3 py-2 text-[13px] leading-relaxed">
                      Révoqué le {formaterDate(c.revoqueLe)}
                      {c.motifRevocation ? ` : ${c.motifRevocation}` : "."} Sa page de vérification l&apos;indique désormais.
                    </p>
                  ) : null}

                  <div className="mt-auto flex flex-wrap gap-2">
                    <a href={`/api/certificats/${c.id}/pdf`} className={classesBouton("nuit", "sm")}>
                      <Download className="h-4 w-4" aria-hidden /> Télécharger le PDF
                    </a>
                    {revoque ? (
                      <a href={`/v/${c.jeton}`} target="_blank" rel="noopener noreferrer" className={classesBouton("contour", "sm")}>
                        <ExternalLink className="h-4 w-4" aria-hidden /> Page de vérification
                      </a>
                    ) : (
                      <>
                        <BoutonCopierLien lien={c.lien} libelle="Copier le lien" variante="contour" taille="sm" />
                        <a
                          href={lienLinkedIn({ nom: parcours, emisLe: c.emisLe, url: c.lien, numero: c.numero })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={classesBouton("contour", "sm")}
                        >
                          <LogoLinkedIn /> Ajouter à LinkedIn
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
