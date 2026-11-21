import { CarteJoueur } from "@/components/competences/carte-joueur";
import { Radar } from "@/components/competences/radar";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { identiteJoueur, profilCompetences } from "@/server/requetes/competences";

/**
 * Section « compétences » d'un profil, en lecture seule.
 *
 * Sert le profil du membre et celui du formateur : la carte de niveau, et le
 * radar sans interaction (l'exploration détaillée reste sur « Mes
 * compétences », qui est privée). Rend `null` quand il n'y a rien à montrer —
 * un radar vide sur un profil public ne dit rien de bon de son propriétaire.
 */
export async function SectionCompetencesProfil({
  utilisateurId,
  compact = false,
}: {
  utilisateurId: string;
  compact?: boolean;
}) {
  const [profil, identite] = await Promise.all([profilCompetences(utilisateurId), identiteJoueur(utilisateurId)]);
  if (!identite || !profil.aDesMesures) return null;

  if (compact) {
    return (
      <CarteJoueur
        identite={identite}
        noteGenerale={profil.noteGenerale}
        palier={profil.palier}
        domaines={profil.domaines}
      />
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[18rem_minmax(0,1fr)]">
      <CarteJoueur
        identite={identite}
        noteGenerale={profil.noteGenerale}
        palier={profil.palier}
        domaines={profil.domaines}
        className="md:self-start"
      />
      <Carte>
        <EnteteCarte
          titre="Profil de compétences"
          description="En pointillés, le point de départ déclaré. En plein, le niveau mesuré aujourd'hui."
        />
        <CorpsCarte className="flex justify-center pt-0">
          <Radar domaines={profil.domaines} largeur={420} />
        </CorpsCarte>
      </Carte>
    </div>
  );
}
