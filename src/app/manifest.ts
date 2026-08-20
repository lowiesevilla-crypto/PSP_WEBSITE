import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Psi Sigma Phi Philippines Inc.",
    short_name: "PSP Philippines",
    description: "Official Psi Sigma Phi Philippines Inc. digital membership platform.",
    start_url: "/member",
    scope: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "any",
    icons: [
      {
        src: "/brand/psp-logo.jpg",
        sizes: "any",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/icons/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    categories: ["social", "business", "productivity"],
  };
}
