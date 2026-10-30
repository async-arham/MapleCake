import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Maplecake",
    short_name: "Maplecake",
    description: "Project health tracking for developers.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#faf6ec",
    theme_color: "#ffdd00",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
