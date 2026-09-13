import type { Metadata } from "next";
import "./globals.css";
import { ServiceWorker } from "@/components/pwa/service-worker";

export const metadata: Metadata = {
  title: "EMS Hospital",
  description: "Herramientas privadas para EMS Hospital",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><ServiceWorker />{children}</body>
    </html>
  );
}





