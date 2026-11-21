import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { utilisateurs } from "@/db/schema";

/**
 * Authentification — next-auth v5, sessions JWT.
 *
 *  - Comptes e-mail + mot de passe : cas nominal, chacun s'inscrit et choisit
 *    son organisation ; le responsable RH confirme ensuite le rattachement.
 *  - Google (facultatif, actif si AUTH_GOOGLE_ID est renseigné) : sans
 *    restriction de domaine, les membres venant d'organisation différentes. Un compte
 *    existant est relié par son e-mail, sinon il est créé.
 *
 * Les rôles sont relus en base à la connexion puis toutes les 5 minutes :
 * un rôle retiré cesse d'agir sans attendre l'expiration de la session.
 */

const RAFRAICHISSEMENT_MS = 5 * 60 * 1000;

async function chargerIdentite(email: string) {
  const [u] = await db
    .select({
      id: utilisateurs.id,
      prenom: utilisateurs.prenom,
      nom: utilisateurs.nom,
      roles: utilisateurs.roles,
      jeId: utilisateurs.jeId,
      photoUrl: utilisateurs.photoUrl,
      actif: utilisateurs.actif,
    })
    .from(utilisateurs)
    .where(eq(utilisateurs.email, email.toLowerCase()))
    .limit(1);
  return u ?? null;
}

const fournisseurs: NextAuthConfig["providers"] = [
  Credentials({
    id: "credentials",
    name: "E-mail et mot de passe",
    credentials: { email: {}, motDePasse: {} },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "").toLowerCase().trim();
      const motDePasse = String(credentials?.motDePasse ?? "");
      if (!email || !motDePasse) return null;
      const [u] = await db
        .select({
          id: utilisateurs.id,
          email: utilisateurs.email,
          prenom: utilisateurs.prenom,
          nom: utilisateurs.nom,
          actif: utilisateurs.actif,
          hash: utilisateurs.motDePasseHash,
        })
        .from(utilisateurs)
        .where(eq(utilisateurs.email, email))
        .limit(1);
      if (!u?.actif || !u.hash) return null;
      if (!(await bcrypt.compare(motDePasse, u.hash))) return null;
      await db.update(utilisateurs).set({ dernierAcces: new Date() }).where(eq(utilisateurs.id, u.id));
      return { id: u.id, email: u.email, name: `${u.prenom} ${u.nom}` };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  fournisseurs.push(Google({ authorization: { params: { prompt: "select_account" } } }));
}

export const googleActif = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  trustHost: true,
  pages: { signIn: "/connexion", error: "/connexion" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 3600 },
  providers: fournisseurs,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") return true;
      const email = user.email?.toLowerCase();
      if (!email) return false;
      if (profile && profile.email_verified === false) return false;
      const existant = await chargerIdentite(email);
      if (existant && !existant.actif) return false;
      const [prenom, ...reste] = (user.name ?? email.split("@")[0]).split(" ");
      if (!existant) {
        await db.insert(utilisateurs).values({
          email,
          prenom: prenom || "Membre",
          nom: reste.join(" ") || "",
          googleId: profile?.sub ?? null,
          photoUrl: user.image ?? null,
          emailVerifieLe: new Date(),
          dernierAcces: new Date(),
        });
      } else {
        await db
          .update(utilisateurs)
          .set({
            googleId: profile?.sub ?? undefined,
            emailVerifieLe: new Date(),
            dernierAcces: new Date(),
            ...(existant.photoUrl ? {} : { photoUrl: user.image ?? null }),
          })
          .where(eq(utilisateurs.id, existant.id));
      }
      return true;
    },
    async jwt({ token, trigger }) {
      const perime = !token.charge || Date.now() - Number(token.charge) > RAFRAICHISSEMENT_MS;
      if ((trigger === "signIn" || trigger === "update" || perime) && token.email) {
        try {
          const u = await chargerIdentite(token.email);
          if (!u || !u.actif) return null;
          token.uid = u.id;
          token.roles = [...u.roles];
          token.jeId = u.jeId;
          token.name = `${u.prenom} ${u.nom}`;
          token.picture = u.photoUrl;
          token.charge = Date.now();
        } catch {
          // Base momentanément indisponible : on garde le jeton existant.
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.uid ?? "");
        session.user.roles = (token.roles as string[]) ?? [];
        session.user.jeId = (token.jeId as string | null) ?? null;
        session.user.image = (token.picture as string | null) ?? null;
      }
      return session;
    },
  },
});
