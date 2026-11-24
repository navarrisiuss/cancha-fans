"use client";

// Componente cliente: necesita la sesión de Firebase Auth (useSesion) para saber de quién son los
// complejos, y la consulta a Firestore corre con el SDK cliente bajo las security rules.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  listarMisComplejos,
  type EstadoComplejo,
  type ResumenComplejo,
} from "../../../lib/firebase/complejos";
import { useSesion } from "../../../lib/firebase/use-sesion";

// Record obliga a cubrir todos los estados. Lima no se usa: está reservado para "reservado",
// "pagado" y bloques disponibles. Rechazado va en carbón y no en rojo: hoy no hay acción posible.
const ESTADOS: Record<EstadoComplejo, { texto: string; clases: string }> = {
  borrador: { texto: "Borrador", clases: "bg-[#F0EEE9] text-[#627067]" },
  en_revision: { texto: "En revisión", clases: "bg-[#F0EEE9] text-[#4D5D54]" },
  aprobado: { texto: "Aprobado", clases: "bg-[#0F7A4D] text-white" },
  rechazado: { texto: "Rechazado", clases: "bg-[#12241C] text-white" },
};

export function ListadoMisComplejos() {
  const router = useRouter();
  const { usuario, cargando } = useSesion();
  // null mientras carga; error aparte para distinguir "sin complejos" de "no se pudo cargar".
  const [complejos, setComplejos] = useState<ResumenComplejo[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (cargando) return;
    if (!usuario) {
      router.replace("/iniciar-sesion?siguiente=/arrendatario/complejos");
      return;
    }
    listarMisComplejos(usuario.uid).then(setComplejos, () => setError(true));
  }, [cargando, usuario, router]);

  if (error) {
    // Problema del sistema, no del usuario: va en carbón.
    return (
      <p role="alert" className="text-sm font-semibold text-[#12241C]">
        No pudimos cargar tus complejos. Inténtalo de nuevo en unos minutos.
      </p>
    );
  }

  if (!complejos) {
    return <p className="text-sm font-medium text-[#627067]">Cargando tus complejos…</p>;
  }

  if (complejos.length === 0) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm text-[#4D5D54]">Todavía no has postulado ningún complejo.</p>
        <Link href="/arrendatario/postular" className="text-sm font-semibold text-[#0F7A4D] hover:underline">
          Publicar mi complejo
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {complejos.map((c) => (
        <li key={c.id}>
          <Link
            href={`/arrendatario/complejos/${c.id}`}
            className="flex items-center justify-between gap-4 rounded-2xl border border-[#DAD7CF] px-5 py-4 transition-colors hover:border-[#0F7A4D]"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-[#12241C]">{c.nombre}</p>
              <p className="text-sm font-medium text-[#627067]">{c.comuna} · Gestionar canchas</p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${ESTADOS[c.estado].clases}`}>
              {ESTADOS[c.estado].texto}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
