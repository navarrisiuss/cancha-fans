// Página de servidor generada estáticamente (SSG): lee content/terminos.md en el build y lo
// renderiza con react-markdown.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import { MarkdownContenido } from "../markdown-contenido";

export const metadata: Metadata = {
  title: "Términos y condiciones — CanchaFans",
  description: "Condiciones de uso de la plataforma CanchaFans.",
};

export default async function PaginaTerminos() {
  const contenido = await readFile(join(process.cwd(), "content", "terminos.md"), "utf8");
  return <MarkdownContenido contenido={contenido} />;
}
