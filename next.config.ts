import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export statico: compatibile con Firebase Hosting
  // Funziona perché tutte le pagine sono "use client" (nessun SSR necessario)
  output: "export",
  trailingSlash: true,
  allowedDevOrigins: ['192.168.1.88'],
  devIndicators: false,
};

export default nextConfig;