"use client";

import Link from "next/link";
import { Archive, Layers, Pencil, RotateCcw, ScrollText, Star } from "lucide-react";
import { lancerAction } from "@/components/admin/retour-action";
import { BlocRepliable } from "@/components/ui/bloc-repliable";
import { Bouton, LienBouton } from "@/components/ui/bouton";
import { BoutonConfirme } from "@/components/ui/confirmation";
import { EtatVide } from "@/components/ui/etat-vide";
import { Pastille } from "@/components/ui/pastille";
import { cn, pluriel } from "@/lib/utils";
import { archiverModele, definirModeleParDefaut, restaurerModele } from "@/server/actions/certificats";
import type { Canevas } from "@/services/canevas/canevas";
import { donneesExemple } from "@/services/certificats/cadre";
import { RenduCertificat } from "../rendu-certificat";
import { BoutonCreationModele, type SourceModele } from "./creation-modele";

export type CarteModele = {
  id: string;
  nom: string;
  couleurTheme: string;
  canevas: Canevas;
  parDefaut: boolean;
  archive: boolean;
  domaine: string | null;
  emis: number;
  parcours: number;
};

function avecFormulaire(action: (fd: FormData) => Promise<{ ok?: boolean; erreur?: string; message?: string }>) {
  return async (fd: FormData) => {
    await lancerAction(() => action(fd));
  };
}

export function GrilleModeles({
  modeles,
  qrExemple,
  peutEcrire,
}: {
  modeles: CarteModele[];
  qrExemple: string;
  peutEcrire: boolean;
}) {
  const actifs = modeles.filter((m) => !m.archive);
  const archives = modeles.filter((m) => m.archive);
  const sources: SourceModele[] = actifs.map((m) => ({ id: m.id, nom: m.nom, parDefaut: m.parDefaut }));
  const donnees = donneesExemple();

  if (!actifs.length && !archives.length) {
    return (
      <EtatVide
        icone={<ScrollText className="h-6 w-6" />}
        titre="Aucun modèle de certificat"
        description="Le modèle de la plateforme se crée tout seul à la première émission. Vous pouvez aussi attendre qu'un membre termine un parcours."
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {actifs.map((m, i) => (
          <article
            key={m.id}
            className="anim-apparition group flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <div className="relative bg-muted/60 p-4 sm:p-5">
              <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: m.couleurTheme }} />
              <Link
                href={peutEcrire ? `/admin/certificats/modeles/${m.id}` : "#"}
                aria-label={peutEcrire ? `Modifier le modèle ${m.nom}` : undefined}
                className={cn(
                  "block transition-transform duration-300 ease-[var(--ease-sortie)]",
                  peutEcrire ? "group-hover:-translate-y-0.5" : "pointer-events-none"
                )}
              >
                <RenduCertificat
                  canevas={m.canevas}
                  couleurTheme={m.couleurTheme}
                  donnees={donnees}
                  qrSvg={qrExemple}
                  libelle={`Miniature du modèle ${m.nom}`}
                  className="rounded-[3px] shadow-[0_10px_30px_-14px_rgb(5_41_49/0.45)]"
                />
              </Link>
              {m.parDefaut ? (
                <Pastille ton="or" className="absolute left-3 top-3 shadow-doux">
                  <Star className="h-3 w-3" aria-hidden /> Par défaut
                </Pastille>
              ) : null}
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 text-[15px] font-bold tracking-tight">
                  <span aria-hidden className="h-3 w-3 shrink-0 rounded-full ring-2 ring-card" style={{ background: m.couleurTheme }} />
                  <span className="truncate">{m.nom}</span>
                </h3>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {m.domaine ? (
                    <>
                      Domaine <span className="font-semibold text-foreground">{m.domaine}</span>
                    </>
                  ) : (
                    "Aucun domaine associé"
                  )}
                </p>
              </div>
              <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <div>
                  <dt className="sr-only">Certificats émis</dt>
                  <dd className="chiffres">
                    <span className="font-bold text-foreground">{m.emis.toLocaleString("fr-FR")}</span> {m.emis > 1 ? "certificats émis" : "certificat émis"}
                  </dd>
                </div>
                <div>
                  <dt className="sr-only">Parcours</dt>
                  <dd className="chiffres">
                    {m.parcours ? `Choisi par ${pluriel(m.parcours, "parcours", "parcours")}` : "Choisi par aucun parcours"}
                  </dd>
                </div>
              </dl>

              {peutEcrire ? (
                <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
                  <LienBouton href={`/admin/certificats/modeles/${m.id}`} variante="contour" taille="sm">
                    <Pencil className="h-3.5 w-3.5" aria-hidden /> Modifier
                  </LienBouton>
                  <BoutonCreationModele sources={sources} sourceInitiale={m.id} libelle="Dupliquer" icone="copie" variante="fantome" taille="sm" />
                  {!m.parDefaut ? (
                    <Bouton
                      variante="fantome"
                      taille="sm"
                      onClick={() => {
                        const fd = new FormData();
                        fd.set("id", m.id);
                        void lancerAction(() => definirModeleParDefaut(fd));
                      }}
                    >
                      <Star className="h-3.5 w-3.5" aria-hidden /> Par défaut
                    </Bouton>
                  ) : null}
                  {!m.parDefaut ? (
                    <BoutonConfirme
                      action={avecFormulaire(archiverModele)}
                      champs={{ id: m.id }}
                      titre="Archiver le modèle"
                      libelleConfirmation="Archiver le modèle"
                      message={
                        <>
                          « {m.nom} » ne servira plus aux prochaines émissions{m.domaine ? ` et sera détaché du domaine ${m.domaine}` : ""}. Les{" "}
                          {m.emis.toLocaleString("fr-FR")} certificats déjà émis gardent leur mise en page. Vous pourrez le restaurer.
                        </>
                      }
                      variante="fantome"
                      taille="sm"
                      className="ml-auto text-muted-foreground"
                    >
                      <Archive className="h-3.5 w-3.5" aria-hidden /> Archiver
                    </BoutonConfirme>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {archives.length ? (
        <BlocRepliable titre={`Modèles archivés (${archives.length})`} resume={archives.map((m) => m.nom).join(" · ")}>
          <ul className="divide-y divide-border">
            {archives.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="w-24 shrink-0 opacity-70 grayscale-[40%]">
                  <RenduCertificat canevas={m.canevas} couleurTheme={m.couleurTheme} donnees={donnees} qrSvg={qrExemple} libelle={`Miniature de ${m.nom}`} className="rounded-[2px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.nom}</p>
                  <p className="chiffres text-xs text-muted-foreground">
                    <Layers className="mr-1 inline h-3 w-3" aria-hidden />
                    {m.emis > 1 ? `${m.emis.toLocaleString("fr-FR")} certificats émis` : `${m.emis} certificat émis`}
                  </p>
                </div>
                {peutEcrire ? (
                  <Bouton
                    variante="contour"
                    taille="sm"
                    onClick={() => {
                      const fd = new FormData();
                      fd.set("id", m.id);
                      void lancerAction(() => restaurerModele(fd));
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Restaurer
                  </Bouton>
                ) : null}
              </li>
            ))}
          </ul>
        </BlocRepliable>
      ) : null}
    </div>
  );
}
