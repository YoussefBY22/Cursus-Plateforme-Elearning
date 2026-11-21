import type * as React from "react";
import { QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { parPlan, remplirJetons, type Bloc, type Canevas } from "@/services/canevas/canevas";
import { cadreCommun } from "@/services/certificats/cadre";
import { carreQr, decalageLigneDeBase, enCqw, positionBloc, taillePoliceCqw } from "@/services/certificats/echelle";

/**
 * Rendu HTML d'un certificat, en lecture seule — le jumeau du PDF.
 *
 * Tout est exprimé en unités de conteneur (`cqw`) rapportées à la largeur de
 * la page : la même page sert de miniature de 260 px et d'affichage plein
 * écran, sans mesure en JavaScript et donc sans saut au chargement. Les
 * règles de dessin suivent `rendu-canevas.ts` : cadre commun sous les blocs,
 * blocs par plan, QR carré centré, filets centrés sur le bord, texte en
 * Montserrat aligné sur la ligne de base du PDF.
 *
 * Composant sans état : utilisable côté serveur comme dans l'éditeur.
 */

const POLICE = "var(--font-montserrat), Montserrat, ui-sans-serif, system-ui, sans-serif";

export function urlImage(fichierId: string): string {
  return `/api/fichiers/${encodeURIComponent(fichierId)}`;
}

type PropsContenu = {
  bloc: Bloc;
  largeurCanevas: number;
  donnees: Record<string, unknown>;
  /** SVG du QR code (généré côté serveur, modules en `currentColor`). */
  qrSvg?: string | null;
  /** Montrer les jetons `{{…}}` tels quels plutôt que les valeurs. */
  brut?: boolean;
};

/** Filet centré sur le bord, comme le trait PDF (un `border` CSS serait intérieur). */
function filet(epaisseur: number, couleur: string, largeurCanevas: number): React.CSSProperties {
  if (!couleur || epaisseur <= 0) return {};
  const e = enCqw(epaisseur, largeurCanevas);
  return { outline: `max(0.5px, ${e}) solid ${couleur}`, outlineOffset: `calc(${e} / -2)` };
}

/** Contenu visuel d'un bloc ; il remplit son parent, qui porte la position. */
export function ContenuBloc({ bloc, largeurCanevas, donnees, qrSvg, brut = false }: PropsContenu) {
  switch (bloc.type) {
    case "RECTANGLE":
      return (
        <span
          aria-hidden
          className="absolute inset-0 block"
          style={{
            backgroundColor: bloc.encadrement.fond || undefined,
            ...filet(bloc.encadrement.epaisseurBordure, bloc.encadrement.bordure, largeurCanevas),
          }}
        />
      );

    case "TEXTE": {
      const s = bloc.style;
      const contenu = brut ? bloc.contenu : remplirJetons(bloc.contenu, donnees);
      return (
        <span
          className="absolute inset-0 flex flex-col overflow-hidden"
          style={{
            backgroundColor: bloc.encadrement.fond || undefined,
            ...filet(bloc.encadrement.epaisseurBordure, bloc.encadrement.bordure, largeurCanevas),
            padding: enCqw(bloc.marge, largeurCanevas),
            justifyContent: s.alignementVertical === "milieu" ? "center" : s.alignementVertical === "bas" ? "flex-end" : "flex-start",
          }}
        >
          <span
            className="relative block w-full whitespace-pre-wrap break-words"
            style={{
              fontFamily: POLICE,
              fontSize: taillePoliceCqw(s.taille, largeurCanevas),
              lineHeight: s.interligne,
              color: s.couleur,
              // Le PDF n'a que trois graisses : le gras l'emporte sur l'italique.
              fontWeight: s.gras ? 700 : 400,
              fontStyle: s.italique && !s.gras ? "italic" : "normal",
              textAlign: s.alignement === "centre" ? "center" : s.alignement === "droite" ? "right" : "left",
              textTransform: s.majuscules ? "uppercase" : "none",
              top: `-${decalageLigneDeBase(s.interligne)}em`,
              letterSpacing: 0,
            }}
          >
            {contenu}
          </span>
        </span>
      );
    }

    case "IMAGE":
      return bloc.fichierId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={urlImage(bloc.fichierId)}
          alt=""
          draggable={false}
          className="absolute inset-0 block h-full w-full"
          style={{ objectFit: bloc.ajustement === "remplir" ? "fill" : "contain", opacity: bloc.opacite }}
        />
      ) : null;

    case "LIGNE": {
      const e = `max(1px, ${enCqw(Math.max(0.05, bloc.epaisseur), largeurCanevas)})`;
      return (
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2"
          style={
            bloc.orientation === "horizontale"
              ? { height: e, width: "100%", backgroundColor: bloc.couleur }
              : { width: e, height: "100%", backgroundColor: bloc.couleur }
          }
        />
      );
    }

    case "QRCODE": {
      const q = carreQr({ x: 0, y: 0, largeur: bloc.largeur, hauteur: bloc.hauteur });
      const cadre: React.CSSProperties = {
        left: `${(q.x / bloc.largeur) * 100}%`,
        top: `${(q.y / bloc.hauteur) * 100}%`,
        width: `${(q.cote / bloc.largeur) * 100}%`,
        height: `${(q.cote / bloc.hauteur) * 100}%`,
        color: bloc.couleur || "#0f1226",
      };
      return qrSvg ? (
        <span
          aria-hidden
          className="absolute block bg-white [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
          style={cadre}
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      ) : (
        <span aria-hidden className="absolute flex items-center justify-center border border-dashed border-current bg-white" style={cadre}>
          <QrCode className="h-1/2 w-1/2" strokeWidth={1.5} />
        </span>
      );
    }

    default:
      return null;
  }
}

/** Filigrane en diagonale, posé comme dans le PDF (35 mm du bord, 95 mm du bas, 38°). */
export function Filigrane({ texte, canevas }: { texte: string; canevas: Pick<Canevas, "largeur" | "hauteur"> }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute block whitespace-nowrap font-bold leading-none"
      style={{
        left: `${(35 / canevas.largeur) * 100}%`,
        top: `${((canevas.hauteur - 95) / canevas.hauteur) * 100}%`,
        fontFamily: POLICE,
        fontSize: taillePoliceCqw(62, canevas.largeur),
        color: "rgb(140 140 140 / 0.16)",
        transformOrigin: "0 0",
        transform: "rotate(-38deg) translateY(-0.86em)",
        zIndex: 10000,
      }}
    >
      {texte.toLocaleUpperCase("fr-FR")}
    </span>
  );
}

export function RenduCertificat({
  canevas,
  couleurTheme,
  donnees,
  qrSvg,
  filigrane,
  libelle = "Certificat",
  className,
  style,
}: {
  canevas: Canevas;
  couleurTheme: string;
  donnees: Record<string, unknown>;
  qrSvg?: string | null;
  filigrane?: string;
  /** Texte lu par les lecteurs d'écran à la place du dessin. */
  libelle?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const blocs = [...cadreCommun(couleurTheme), ...parPlan(canevas.blocs)].filter((b) => !b.masque);
  return (
    <div
      role="img"
      aria-label={libelle}
      className={cn("relative w-full select-none overflow-hidden bg-white", className)}
      style={{ aspectRatio: `${canevas.largeur} / ${canevas.hauteur}`, containerType: "inline-size", ...style }}
    >
      {blocs.map((b) => (
        <div key={b.id} aria-hidden className="absolute" style={positionBloc(b, canevas)}>
          <ContenuBloc bloc={b} largeurCanevas={canevas.largeur} donnees={donnees} qrSvg={qrSvg} />
        </div>
      ))}
      {filigrane ? <Filigrane texte={filigrane} canevas={canevas} /> : null}
    </div>
  );
}
