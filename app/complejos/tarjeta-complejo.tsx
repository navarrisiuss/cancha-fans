import Link from "next/link";
import type { DatosComplejo } from "../../lib/firebase/complejos";
import type { Formato } from "../../lib/tipos/cancha";

export type ResumenPublicoComplejo = Pick<DatosComplejo, "nombre" | "comuna"> & {
  id: string;
  foto: string | null;
  formatosDisponibles: Formato[];
  ratingPromedio: number;
  totalResenas: number;
};

export function textoCalificacion(ratingPromedio: number, totalResenas: number) {
  if (totalResenas === 0) return "Sin reseñas";
  const promedio = ratingPromedio.toLocaleString("es-CL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${promedio} de 5 · ${totalResenas} ${totalResenas === 1 ? "reseña" : "reseñas"}`;
}

// La tarjeta solo presenta datos públicos. Se renderiza en servidor en la búsqueda
// y también puede usarla la landing, que recibe los destacados como props.
export function TarjetaComplejo({
  complejo,
  preferencias,
}: {
  complejo: ResumenPublicoComplejo;
  preferencias?: { fecha?: string; hora?: string; formato?: Formato };
}) {
  return (
    <Link
      href={{ pathname: `/complejos/${encodeURIComponent(complejo.id)}`, query: preferencias }}
      prefetch={false}
      className="block h-full overflow-hidden rounded-[24px] border border-[#DAD7CF] bg-white transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F7A4D]"
    >
      {complejo.foto ? (
        // La URL viene de Firebase Storage. next/image requeriría configurar su dominio y usar el optimizador de Vercel.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={complejo.foto} alt="" loading="lazy" className="aspect-[16/9] w-full bg-[#F0EEE9] object-cover" />
      ) : (
        <div aria-hidden="true" className="field-lines aspect-[16/9] bg-[#12241C]" />
      )}
      <div className="p-5">
        <h3 className="text-xl font-semibold tracking-[-0.025em]">{complejo.nombre}</h3>
        <p className="mt-1 text-sm text-[#4D5D54]">{complejo.comuna}</p>
        <p className="mt-3 text-sm font-semibold text-[#0F7A4D]">
          {complejo.formatosDisponibles.join(" · ") || "Sin canchas publicadas"}
        </p>
        <p className="mt-2 text-sm text-[#4D5D54]">
          {textoCalificacion(complejo.ratingPromedio, complejo.totalResenas)}
        </p>
      </div>
    </Link>
  );
}
