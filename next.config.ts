import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export statico: compatibile con Firebase Hosting
  // Funziona perché tutte le pagine sono "use client" (nessun SSR necessario)
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
