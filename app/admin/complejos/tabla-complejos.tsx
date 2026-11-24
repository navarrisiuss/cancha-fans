"use client";

// Componente cliente: pide las páginas de /api/admin/listado-complejos con el token de sesión del
// administrador y mantiene el cursor para cargar más documentos bajo demanda.
import Link from "next/link";
import { useEffect, useState } from "react";
import type { EstadoComplejo } from "../../../lib/firebase/complejos";
import { fetchAdmin } from "../../../lib/firebase/fetch-admin";
import type {
  ComplejoListadoAdmin,
  RespuestaListadoComplejos,
} from "../../api/admin/listado-complejos/route";
import { formatearFecha } from "../fechas";

const ESTADOS: Record<EstadoComplejo, { texto: string; clases: string }> = {
  borrador: { texto: "Borrador", clases: "bg-[#F0EEE9] text-[#627067]" },
  en_revision: { texto: "En revisión", clases: "bg-[#F0EEE9] text-[#4D5D54]" },
  aprobado: { texto: "Aprobado", clases: "bg-[#0F7A4D] text-white" },
  rechazado: { texto: "Rechazado", clases: "bg-[#12241C] text-white" },
};

export function TablaComplejosAdmin() {
  const [complejos, setComplejos] = useState<ComplejoListadoAdmin[] | null>(null);
  const [siguienteCursor, setSiguienteCursor] = useState<string | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchAdmin("/api/admin/listado-complejos")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((datos: RespuestaListadoComplejos) => {
        setComplejos(datos.complejos);
        setSiguienteCursor(datos.siguienteCursor);
      })
      .catch(() => setError(true));
  }, []);

  async function cargarMas() {
    if (!siguienteCursor || cargandoMas) return;
    setCargandoMas(true);
    try {
      const respuesta = await fetchAdmin(
        `/api/admin/listado-complejos?cursor=${encodeURIComponent(siguienteCursor)}`,
      );
      if (!respuesta.ok) throw new Error("Error al paginar complejos");
      const datos = (await respuesta.json()) as RespuestaListadoComplejos;
      setComplejos((actual) => (actual ? [...actual, ...datos.complejos] : datos.complejos));
      setSiguienteCursor(datos.siguienteCursor);
    } catch {
      setError(true);
    }
    setCargandoMas(false);
  }

  if (error) {
    return (
      <p role="alert" className="text-sm font-semibold text-[#12241C]">
        No pudimos cargar el listado de complejos. Recarga la página en unos minutos.
      </p>
    );
  }

  if (!complejos) {
    return <p className="text-sm font-medium text-[#627067]">Cargando complejos…</p>;
  }

  if (complejos.length === 0) {
    return <p className="text-sm text-[#4D5D54]">No hay complejos registrados en la plataforma.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-[24px] bg-white shadow-[0_8px_30px_rgba(18,36,28,0.06)]">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#E7E5DF] text-xs font-semibold uppercase tracking-[0.1em] text-[#627067]">
              <th className="px-6 py-4">Complejo</th>
              <th className="px-6 py-4">Ubicación</th>
              <th className="px-6 py-4">Dueño</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Postulado</th>
              <th className="px-6 py-4 text-right">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E5DF]">
            {complejos.map((c) => (
              <tr key={c.id} className="hover:bg-[#F0EEE9]/35">
                <td className="px-6 py-4">
                  <p className="font-semibold text-[#12241C]">{c.nombre}</p>
                  {c.formatosDisponibles.length > 0 && (
                    <p className="mt-0.5 text-xs text-[#627067]">
                      Formatos: {c.formatosDisponibles.join(", ")}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4 text-[#4D5D54]">
                  {c.comuna}, {c.region}
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-[#12241C]">
                    {c.duenoNombre || "Sin nombre"}
                  </p>
                  <p className="text-xs text-[#627067]">{c.duenoEmail || c.ownerId}</p>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                      ESTADOS[c.estado].clases
                    }`}
                  >
                    {ESTADOS[c.estado].texto}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-[#627067]">
                  {c.createdAt > 0 ? formatearFecha(c.createdAt) : "—"}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/admin/complejos/${c.id}`}
                    className="font-semibold text-[#0F7A4D] hover:underline"
                  >
                    Ver ficha →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {siguienteCursor && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            disabled={cargandoMas}
            onClick={() => void cargarMas()}
            className="rounded-xl border border-[#DAD7CF] bg-white px-5 py-2.5 text-sm font-semibold text-[#12241C] transition-colors hover:bg-[#F0EEE9] disabled:opacity-60"
          >
            {cargandoMas ? "Cargando…" : "Cargar más complejos"}
          </button>
        </div>
      )}
    </div>
  );
}
