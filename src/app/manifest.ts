import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ArchForge",
    short_name: "ArchForge",
    description:
      "Local-first, provider-neutral system architecture design and validation.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f6fa",
    theme_color: "#255bb5",
    icons: [],
  };
}
