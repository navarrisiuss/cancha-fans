// Página de servidor generada estáticamente (SSG): lee content/ayuda.md desde el disco en el build
// y lo renderiza con react-markdown sin hidratación adicional en el cliente.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import { MarkdownContenido } from "../markdown-contenido";

export const metadata: Metadata = {
  title: "Centro de ayuda — CanchaFans",
  description: "Preguntas frecuentes para jugadores y arrendatarios en CanchaFans.",
};

export default async function PaginaAyuda() {
  const contenido = await readFile(join(process.cwd(), "content", "ayuda.md"), "utf8");
  return <MarkdownContenido contenido={contenido} />;
}
