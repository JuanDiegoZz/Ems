import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { ActiveShiftProvider } from "@/components/shifts/active-shift-provider";
import { ToastProvider } from "@/components/feedback/toast-provider";
import { ConnectivityProvider } from "@/components/feedback/connectivity-provider";
import { ShortcutListener } from "@/components/feedback/shortcut-listener";

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
      <body className="min-h-full flex flex-col"><ServiceWorker /><ToastProvider><ConnectivityProvider><ShortcutListener><ActiveShiftProvider>{children}</ActiveShiftProvider></ShortcutListener></ConnectivityProvider></ToastProvider></body>
    </html>
  );
}
