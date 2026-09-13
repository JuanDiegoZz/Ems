import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name: "EMS Hospital", short_name: "EMS", description: "Herramientas privadas para EMS Hospital", start_url: "/", display: "standalone", background_color: "#f4f7fb", theme_color: "#2563eb", icons: [{ src: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" }, { src: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml" }] }; }




