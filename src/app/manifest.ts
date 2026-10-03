import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Scooter Battery",
    short_name: "Scooter",
    description: "Live battery, range and cell health for your e-scooter",
    start_url: "/",
    display: "standalone",
    background_color: "#040605",
    theme_color: "#040605",
    orientation: "portrait",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/icon", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
