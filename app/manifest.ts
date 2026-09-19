import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mis Gastos",
    short_name: "Gastos",
    description: "Control y seguimiento de gastos personales.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f5f9",
    theme_color: "#4f46e5",
    lang: "es-AR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Nuevo gasto", url: "/gastos/nuevo", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Uber", url: "/gastos/nuevo/uber", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
