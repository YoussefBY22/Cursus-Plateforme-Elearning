"use client";

import { useState, useTransition } from "react";
import { Ban, Download, ExternalLink, KeyRound, RotateCcw, ScrollText } from "lucide-react";
import { lancerAction } from "@/components/admin/retour-action";
import { Bouton, classesBouton } from "@/components/ui/bouton";
import { Groupe, ZoneTexte } from "@/components/ui/champ";
import { BoutonConfirme } from "@/components/ui/confirmation";
import { Dialogue } from "@/components/ui/dialogue";
import { Pastille } from "@/components/ui/pastille";
import { Tableau, type ColonneTable, type FiltreTable } from "@/components/ui/tableau";
import { toast } from "@/components/ui/toasts";
import { cn, formaterDate } from "@/lib/utils";
import { regenererJetonCertificat, retablirCertificatAdmin, revoquerCertificatAdmin } from "@/server/actions/certificats";

export type LigneCertificatEmis = {
  id: string;
  numero: string;
  jeton: string;
  emisLe: Date;
  revoqueLe: Date | null;
  motifRevocation: string | null;
  consultations: number;
  membre: string;
  email: string;
  jeId: string | null;
  je: string;
  jeSigle: string | null;
  parcoursId: string;
  parcours: string;
};

const icone = "h-8 w-8 px-0";

function DialogueRevocation({ ligne }: { ligne: LigneCertificatEmis }) {
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const idChamp = `motif-${ligne.id}`;

  function valider(e: React.FormEvent) {
    e.preventDefault();
    if (motif.trim().length < 5) {
      setErreur("Précisez le motif (5 caractères au moins) : il sera montré au titulaire et sur la page de vérification.");
      return;
    }
    demarrer(async () => {
      const fd = new FormData();
      fd.set("id", ligne.id);
      fd.set("motif", motif);
      const r = await revoquerCertificatAdmin(fd);
      if (r.ok) {
        toast({ titre: "Certificat révoqué", description: `${ligne.numero} affiche désormais « Certificat révoqué ».`, ton: "succes" });
        setOuvert(false);
        setMotif("");
      } else {
        setErreur(r.erreurs?.motif ?? r.erreur ?? "Révocation impossible.");
      }
    });
  }

  return (
    <>
      <Bouton
        variante="danger"
        taille="sm"
        className={icone}
        aria-label={`Révoquer le certificat ${ligne.numero}`}
        title="Révoquer le certificat"
        onClick={() => {
          setErreur(null);
          setOuvert(true);
        }}
      >
        <Ban className="h-4 w-4" aria-hidden />
      </Bouton>
      <Dialogue ouvert={ouvert} onFermer={() => setOuvert(false)} titre="Révoquer le certificat" description={`${ligne.numero} · ${ligne.membre} · ${ligne.parcours}`}>
        <form onSubmit={valider} className="grid gap-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            La page de vérification affichera « Certificat révoqué » avec la date et le motif, et le PDF portera la mention
            « Révoqué ». Le titulaire est prévenu par e-mail. Vous pourrez rétablir le certificat.
          </p>
          <Groupe id={idChamp} label="Motif de la révocation" erreur={erreur} aide="Visible publiquement : restez factuel.">
            <ZoneTexte
              id={idChamp}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              maxLength={300}
              required
              autoFocus
              placeholder="Ex. : évaluation finale obtenue de manière frauduleuse."
              aria-invalid={!!erreur}
              aria-describedby={erreur ? `${idChamp}-erreur` : undefined}
            />
          </Groupe>
          <div className="flex justify-end gap-2">
            <Bouton variante="contour" onClick={() => setOuvert(false)}>
              Annuler
            </Bouton>
            <Bouton type="submit" disabled={enCours}>
              {enCours ? "Révocation…" : "Révoquer le certificat"}
            </Bouton>
          </div>
        </form>
      </Dialogue>
    </>
  );
}

function Actions({ ligne, peutEcrire }: { ligne: LigneCertificatEmis; peutEcrire: boolean }) {
  return (
    <span className="flex items-center justify-end gap-1">
      <a
        href={`/api/certificats/${ligne.id}/pdf`}
        className={classesBouton("contour", "sm", icone)}
        aria-label={`Télécharger le PDF du certificat ${ligne.numero}`}
        title="Télécharger le PDF"
      >
        <Download className="h-4 w-4" aria-hidden />
      </a>
      <a
        href={`/v/${ligne.jeton}`}
        target="_blank"
        rel="noopener noreferrer"
        className={classesBouton("contour", "sm", icone)}
        aria-label={`Ouvrir la page de vérification du certificat ${ligne.numero}`}
        title="Ouvrir la page de vérification"
      >
        <ExternalLink className="h-4 w-4" aria-hidden />
      </a>
      {peutEcrire ? (
        <>
          {ligne.revoqueLe ? (
            <BoutonConfirme
              action={async (fd) => {
                await lancerAction(() => retablirCertificatAdmin(fd));
              }}
              champs={{ id: ligne.id }}
              variante="contour"
              taille="sm"
              className={icone}
              aria-label={`Rétablir le certificat ${ligne.numero}`}
              title="Rétablir le certificat"
              titre="Rétablir le certificat"
              libelleConfirmation="Rétablir le certificat"
              message={
                <>
                  {ligne.numero} redeviendra authentique sur sa page de vérification, et le motif de révocation sera effacé
                  {ligne.motifRevocation ? ` (« ${ligne.motifRevocation} »)` : ""}.
                </>
              }
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
            </BoutonConfirme>
          ) : (
            <DialogueRevocation ligne={ligne} />
          )}
          <BoutonConfirme
            action={async (fd) => {
              await lancerAction(() => regenererJetonCertificat(fd));
            }}
            champs={{ id: ligne.id }}
            variante="contour"
            taille="sm"
            className={icone}
            aria-label={`Régénérer le jeton du certificat ${ligne.numero}`}
            title="Régénérer le jeton de vérification"
            titre="Régénérer le jeton de vérification"
            libelleConfirmation="Régénérer le jeton"
            message={
              <>
                <strong className="text-foreground">Le QR code et le lien actuels cesseront immédiatement de fonctionner</strong>, y
                compris sur les PDF déjà imprimés ou partagés (LinkedIn, CV). Le titulaire devra télécharger le nouveau PDF. À
                réserver à un lien diffusé par erreur.
              </>
            }
          >
            <KeyRound className="h-4 w-4" aria-hidden />
          </BoutonConfirme>
        </>
      ) : null}
    </span>
  );
}

export function TableauCertificatsEmis({ lignes, peutEcrire }: { lignes: LigneCertificatEmis[]; peutEcrire: boolean }) {
  const colonnes: ColonneTable<LigneCertificatEmis>[] = [
    {
      cle: "numero",
      libelle: "Numéro",
      rendu: (l) => <span className="chiffres whitespace-nowrap font-mono text-[13px] font-semibold">{l.numero}</span>,
      valeurTri: (l) => l.numero,
      valeurCsv: (l) => l.numero,
    },
    {
      cle: "membre",
      libelle: "Membre",
      rendu: (l) => (
        <span className="block min-w-[10rem]">
          <span className="block font-semibold">{l.membre}</span>
          <span className="block truncate text-xs text-muted-foreground">{l.email}</span>
        </span>
      ),
      valeurTri: (l) => l.membre.toLowerCase(),
      valeurCsv: (l) => l.membre,
    },
    {
      cle: "je",
      libelle: "Organisation",
      rendu: (l) => (l.je ? <span title={l.je}>{l.jeSigle ?? l.je}</span> : <span className="text-xs text-muted-foreground">—</span>),
      valeurTri: (l) => l.jeSigle ?? l.je,
      valeurCsv: (l) => l.je,
    },
    {
      cle: "parcours",
      libelle: "Parcours",
      rendu: (l) => <span className="block min-w-[10rem] max-w-[16rem] truncate" title={l.parcours}>{l.parcours}</span>,
      valeurTri: (l) => l.parcours.toLowerCase(),
      valeurCsv: (l) => l.parcours,
    },
    {
      cle: "date",
      libelle: "Émis le",
      rendu: (l) => <span className="chiffres whitespace-nowrap text-muted-foreground">{formaterDate(l.emisLe, { day: "numeric", month: "short", year: "numeric" })}</span>,
      valeurTri: (l) => new Date(l.emisLe).getTime(),
      valeurCsv: (l) => new Date(l.emisLe).toISOString().slice(0, 10),
    },
    {
      cle: "statut",
      libelle: "Statut",
      rendu: (l) =>
        l.revoqueLe ? (
          <span className="block max-w-[14rem]">
            <Pastille ton="danger">Révoqué</Pastille>
            {l.motifRevocation ? (
              <span className="mt-0.5 block truncate text-xs text-muted-foreground" title={l.motifRevocation}>
                {l.motifRevocation}
              </span>
            ) : null}
          </span>
        ) : (
          <Pastille ton="succes">Valide</Pastille>
        ),
      valeurTri: (l) => (l.revoqueLe ? 1 : 0),
      valeurCsv: (l) => (l.revoqueLe ? `Révoqué : ${l.motifRevocation ?? ""}` : "Valide"),
    },
    {
      cle: "vues",
      libelle: "Vérifications",
      rendu: (l) => (
        <span className={cn("chiffres", l.consultations ? "font-semibold" : "text-muted-foreground")} title="Consultations de la page publique">
          {l.consultations.toLocaleString("fr-FR")}
        </span>
      ),
      valeurTri: (l) => l.consultations,
      valeurCsv: (l) => l.consultations,
      className: "text-right",
    },
    {
      cle: "actions",
      libelle: "",
      rendu: (l) => <Actions ligne={l} peutEcrire={peutEcrire} />,
      className: "text-right",
    },
  ];

  const parcours = [...new Map(lignes.map((l) => [l.parcoursId, l.parcours])).entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"));
  const jes = [...new Map(lignes.filter((l) => l.jeId).map((l) => [l.jeId as string, l.jeSigle ?? l.je])).entries()].sort((a, b) =>
    a[1].localeCompare(b[1], "fr")
  );
  const filtres: FiltreTable<LigneCertificatEmis>[] = [
    {
      cle: "statut",
      libelle: "Statut",
      options: [
        { valeur: "valide", libelle: "Valides" },
        { valeur: "revoque", libelle: "Révoqués" },
      ],
      predicat: (l, v) => (v === "revoque" ? !!l.revoqueLe : !l.revoqueLe),
    },
    {
      cle: "parcours",
      libelle: "Parcours",
      options: parcours.map(([valeur, libelle]) => ({ valeur, libelle })),
      predicat: (l, v) => l.parcoursId === v,
    },
    {
      cle: "je",
      libelle: "Organisation",
      options: jes.map(([valeur, libelle]) => ({ valeur, libelle })),
      predicat: (l, v) => l.jeId === v,
    },
  ];

  return (
    <Tableau
      lignes={lignes}
      cleLigne={(l) => l.id}
      colonnes={colonnes}
      filtres={filtres}
      rechercheTexte={(l) => `${l.numero} ${l.membre} ${l.email} ${l.je} ${l.jeSigle ?? ""} ${l.parcours}`}
      placeholderRecherche="Rechercher un numéro, un membre, un parcours…"
      exportCsv={{ nomFichier: "cursus-certificats" }}
      icone={<ScrollText className="h-6 w-6" />}
      titreVide="Aucun certificat émis"
      descriptionVide="Les certificats apparaissent ici dès qu'un membre termine un parcours certifiant."
    />
  );
}
