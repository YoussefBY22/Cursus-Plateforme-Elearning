import type { ReactNode } from "react";
import Link from "next/link";
import { Award, Camera, Code2, Globe, Link2, MessageCircle, ScrollText, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { Pastille } from "@/components/ui/pastille";
import { Stat } from "@/components/ui/stat";
import { formaterDate } from "@/lib/utils";
import type { ProfilPublic } from "@/server/requetes/profils";
import { ROLES, type CodeRole } from "@/services/rbac";

/**
 * En-tête d'un profil : identité, organisation, liens de contact.
 *
 * Il n'y a pas de messagerie interne sur la plateforme — c'est un choix, pas
 * un manque. On se joint par LinkedIn ou WhatsApp, là où les gens répondent
 * déjà.
 */
export function CarteProfil({ profil }: { profil: ProfilPublic }) {
  const liens = [
    profil.linkedin ? { href: profil.linkedin, libelle: "LinkedIn", icone: Link2 } : null,
    profil.lienWhatsapp ? { href: profil.lienWhatsapp, libelle: "WhatsApp", icone: MessageCircle } : null,
    profil.reseaux.instagram ? { href: profil.reseaux.instagram, libelle: "Instagram", icone: Camera } : null,
    profil.reseaux.github ? { href: profil.reseaux.github, libelle: "GitHub", icone: Code2 } : null,
    profil.reseaux.site ? { href: profil.reseaux.site, libelle: "Site", icone: Globe } : null,
  ].filter((l): l is { href: string; libelle: string; icone: typeof Link2 } => l !== null);

  return (
    <Carte>
      <CorpsCarte className="pt-6">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar nom={profil.nom} photo={profil.photoUrl} taille="xxl" />
          <div className="min-w-48 flex-1">
            <h2 className="text-xl font-bold tracking-tight">{profil.nom}</h2>
            {profil.poste ? <p className="mt-0.5 text-[15px] text-muted-foreground">{profil.poste}</p> : null}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {profil.je ? <Pastille couleur={profil.je.couleur}>{profil.je.sigle ?? profil.je.nom}</Pastille> : null}
              {profil.departement ? <Pastille ton="contour">{profil.departement}</Pastille> : null}
              {profil.roles
                .filter((r) => r !== "MEMBRE")
                .map((r) => (
                  <Pastille key={r} ton="nuit">
                    {ROLES[r as CodeRole]?.libelle ?? r}
                  </Pastille>
                ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Membre depuis {formaterDate(profil.membreDepuis)}</p>
          </div>

          {liens.length ? (
            <div className="flex flex-wrap gap-2">
              {liens.map((l) => (
                <a
                  key={l.libelle}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3.5 text-[13px] font-semibold transition-colors hover:border-foreground/30 hover:bg-muted"
                >
                  <l.icone className="h-4 w-4" aria-hidden />
                  {l.libelle}
                </a>
              ))}
            </div>
          ) : null}
        </div>

        {profil.bio ? (
          <p className="mt-5 whitespace-pre-line border-t border-border pt-5 text-[15px] leading-relaxed">{profil.bio}</p>
        ) : null}
      </CorpsCarte>
    </Carte>
  );
}

export function StatsProfilCartes({ profil }: { profil: ProfilPublic }) {
  if (!profil.stats) {
    return (
      <Carte>
        <CorpsCarte className="pt-5 text-[13px] leading-relaxed text-muted-foreground">
          Ce membre garde ses statistiques privées.
        </CorpsCarte>
      </Carte>
    );
  }
  const s = profil.stats;
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Stat libelle="Niveau" valeur={s.niveau} indice={s.titreNiveau} icone={<Sparkles className="h-4 w-4" />} accent="var(--primary)" />
      <Stat libelle="Formations terminées" valeur={s.formationsTerminees} />
      <Stat libelle="Certificats" valeur={s.certificats} icone={<ScrollText className="h-4 w-4" />} />
      <Stat libelle="Badges" valeur={s.badges} icone={<Award className="h-4 w-4" />} />
    </div>
  );
}

export function FriseProfil({ profil }: { profil: ProfilPublic }) {
  if (!profil.historique.length) return null;
  return (
    <Carte>
      <EnteteCarte titre="Parcours associatif" />
      <CorpsCarte className="pt-0">
        <ol className="relative space-y-5 border-l border-border pl-5">
          {profil.historique.map((h) => (
            <li key={h.id} className="relative">
              <span
                aria-hidden
                className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary"
              />
              <p className="text-xs font-bold tabular-nums text-muted-foreground">
                {h.annee}
                {h.anneeFin ? ` – ${h.anneeFin}` : " – en cours"}
              </p>
              <p className="mt-0.5 text-[14px] font-semibold">{h.poste}</p>
              <p className="text-[13px] text-muted-foreground">{h.organisation}</p>
              {h.description ? <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{h.description}</p> : null}
            </li>
          ))}
        </ol>
      </CorpsCarte>
    </Carte>
  );
}

export function LienProfil({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Link href={`/membres/${id}`} className="hover:underline">
      {children}
    </Link>
  );
}
