import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-lib, fontkit, qrcode et le pilote PostgreSQL tournent côté serveur
  // uniquement : inutile de les empaqueter.
  serverExternalPackages: ["postgres", "pdf-lib", "@pdf-lib/fontkit", "qrcode", "bcryptjs"],
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Pages de vérification : jamais indexées, jamais mises en cache par un tiers.
        source: "/v/:jeton*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      {
        source: "/:chemin*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
