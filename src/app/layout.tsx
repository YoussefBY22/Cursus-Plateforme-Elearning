import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { resoudreTheme } from "@/server/theme";

/*
 * Montserrat, la police de la charte — servie depuis le dépôt, jamais depuis
 * Google : la plateforme ne dépend d'aucun tiers pour s'afficher, et c'est
 * la même police que celle embarquée dans les certificats PDF.
 */
const montserrat = localFont({
  variable: "--font-montserrat",
  display: "swap",
  src: [
    { path: "./polices/Montserrat-VariableFont_wght.ttf", weight: "100 900", style: "normal" },
    { path: "./polices/Montserrat-Italic-VariableFont_wght.ttf", weight: "100 900", style: "italic" },
  ],
});

export const metadata: Metadata = {
  title: { default: "Cursus", template: "%s · Cursus" },
  description:
    "La plateforme de formation en ligne : formations vidéo, parcours certifiants et mesure des compétences.",
  applicationName: "Cursus",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f1226" },
    { media: "(prefers-color-scheme: dark)", color: "#080a18" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = await resoudreTheme();
  return (
    <html
      lang="fr"
      data-theme={theme === "systeme" ? undefined : theme}
      className={`${montserrat.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
