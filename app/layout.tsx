import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studio de Cílios | Agendamento",
  description: "Agende seu atendimento de cílios e sobrancelhas.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
