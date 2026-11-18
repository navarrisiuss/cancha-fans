"use client";

// Componente cliente: pide la cola a /api/admin/complejos con el token de la sesión, que solo existe
// en el navegador. Se monta dentro del guard, así que la sesión ya está confirmada.
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchAdmin } from "../../lib/firebase/fetch-admin";
import type { ComplejoEnCola } from "../api/admin/complejos/route";
import { formatearFecha } from "./fechas";

export function ColaRevision() {
  // null mientras carga; error aparte para distinguir "cola vacía" de "no se pudo cargar".
  const [cola, setCola] = useState<ComplejoEnCola[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchAdmin("/api/admin/complejos")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setCola, () => setError(true));
  }, []);

  if (error) {
    // Problema del sistema: va en carbón.
    return (
      <p role="alert" className="text-sm font-semibold text-[#12241C]">
        No pudimos cargar la cola. Recarga la página en unos minutos.
      </p>
    );
  }
  if (!cola) return <p className="text-sm font-medium text-[#627067]">Cargando postulaciones…</p>;
  if (cola.length === 0) {
    return <p className="text-sm text-[#4D5D54]">No hay complejos esperando revisión.</p>;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cola.map((c) => (
        <li key={c.id}>
          <Link
            href={`/admin/complejos/${c.id}`}
            className="block rounded-2xl border border-[#DAD7CF] bg-white px-5 py-4 transition-colors hover:border-[#0F7A4D]"
          >
            <p className="truncate font-semibold">{c.nombre}</p>
            <p className="text-sm font-medium text-[#627067]">
              {c.comuna}, {c.region}
            </p>
            <p className="mt-2 text-xs font-medium text-[#627067]">Postulado el {formatearFecha(c.createdAt)}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
