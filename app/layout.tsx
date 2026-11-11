import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jiapeng • Proceso electoral 2026",
  description:
    "Elección de representantes de los trabajadores ante el Comité de Intervención frente al Hostigamiento Sexual - Jiapeng.",
  icons: {
    icon: "/candidates/logo-hd.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
