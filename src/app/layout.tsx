import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ServiceWorker } from "@/components/pwa/service-worker";

export const metadata: Metadata = {
  title: "EMS Hospital",
  description: "Herramientas privadas para EMS Hospital",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><ServiceWorker />{children}</body>
    </html>
  );
}
