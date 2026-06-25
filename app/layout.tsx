import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "CERCA Reencuentro",
  description: "Búsqueda y reunificación familiar con contacto protegido.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-black tracking-tight text-cerca-900">CERCA Reencuentro</Link>
            <nav className="flex items-center gap-2 text-sm font-semibold">
              <Link href="/ayudar" className="rounded-full px-3 py-2 text-slate-600">Ayudar</Link>
              <Link href="/mi-cuenta" className="rounded-full px-3 py-2 text-slate-600">Mis reportes</Link>
              <Link href="/reportar" className="rounded-full bg-cerca-600 px-4 py-2 text-white">Reportar</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="mx-auto max-w-5xl px-4 py-10 text-xs text-slate-500">
          Plataforma ciudadana de apoyo. No sustituye a organismos de emergencia. No publiques rumores ni datos sensibles.
        </footer>
      </body>
    </html>
  );
}
