// Página de servidor generada estáticamente (SSG): lee content/reglas-de-cancelacion.md en el build
// y destaca las constantes vigentes de lib/reglas.ts (anticipación, ventana y penalización).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import {
  ANTICIPACION_MINIMA_HORAS,
  PORCENTAJE_PENALIZACION_CANCELACION,
  VENTANA_CANCELACION_HORAS,
} from "../../../lib/reglas";
import { MarkdownContenido } from "../markdown-contenido";

export const metadata: Metadata = {
  title: "Reglas de cancelación — CanchaFans",
  description: "Plazos y condiciones para cancelar reservas en CanchaFans.",
};

export default async function PaginaReglasDeCancelacion() {
  const contenido = await readFile(
    join(process.cwd(), "content", "reglas-de-cancelacion.md"),
    "utf8",
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 rounded-2xl border border-[#E7E5DF] bg-[#F0EEE9]/55 p-4 text-xs font-semibold text-[#12241C] sm:grid-cols-3">
        <div className="rounded-xl bg-white p-3.5">
          <p className="text-[#627067]">Ventana sin costo</p>
          <p className="mt-1 text-base text-[#0F7A4D]">
            {VENTANA_CANCELACION_HORAS} hora desde la reserva
          </p>
        </div>
        <div className="rounded-xl bg-white p-3.5">
          <p className="text-[#627067]">Fuera de la ventana</p>
          <p className="mt-1 text-base text-[#12241C]">
            {PORCENTAJE_PENALIZACION_CANCELACION}% de pérdida
          </p>
        </div>
        <div className="rounded-xl bg-white p-3.5">
          <p className="text-[#627067]">Anticipación mínima</p>
          <p className="mt-1 text-base text-[#12241C]">
            {ANTICIPACION_MINIMA_HORAS} horas antes del partido
          </p>
        </div>
      </div>
      <MarkdownContenido contenido={contenido} />
    </div>
  );
}
