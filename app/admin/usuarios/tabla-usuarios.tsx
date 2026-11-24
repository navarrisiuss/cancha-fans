"use client";

// Componente cliente: consulta /api/admin/usuarios con el token de administrador y gestiona la
// paginación por cursor para cargar más usuarios sin leer toda la colección de golpe.
import { useEffect, useState } from "react";
import { fetchAdmin } from "../../../lib/firebase/fetch-admin";
import type {
  RespuestaListadoUsuarios,
  UsuarioListadoAdmin,
} from "../../api/admin/usuarios/route";
import { formatearFecha } from "../fechas";

export function TablaUsuariosAdmin() {
  const [usuarios, setUsuarios] = useState<UsuarioListadoAdmin[] | null>(null);
  const [siguienteCursor, setSiguienteCursor] = useState<string | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchAdmin("/api/admin/usuarios")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((datos: RespuestaListadoUsuarios) => {
        setUsuarios(datos.usuarios);
        setSiguienteCursor(datos.siguienteCursor);
      })
      .catch(() => setError(true));
  }, []);

  async function cargarMas() {
    if (!siguienteCursor || cargandoMas) return;
    setCargandoMas(true);
    try {
      const respuesta = await fetchAdmin(
        `/api/admin/usuarios?cursor=${encodeURIComponent(siguienteCursor)}`,
      );
      if (!respuesta.ok) throw new Error("Error al paginar usuarios");
      const datos = (await respuesta.json()) as RespuestaListadoUsuarios;
      setUsuarios((actual) => (actual ? [...actual, ...datos.usuarios] : datos.usuarios));
      setSiguienteCursor(datos.siguienteCursor);
    } catch {
      setError(true);
    }
    setCargandoMas(false);
  }

  if (error) {
    return (
      <p role="alert" className="text-sm font-semibold text-[#12241C]">
        No pudimos cargar el listado de usuarios. Recarga la página en unos minutos.
      </p>
    );
  }

  if (!usuarios) {
    return <p className="text-sm font-medium text-[#627067]">Cargando usuarios…</p>;
  }

  if (usuarios.length === 0) {
    return <p className="text-sm text-[#4D5D54]">No hay usuarios registrados.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-[24px] bg-white shadow-[0_8px_30px_rgba(18,36,28,0.06)]">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#E7E5DF] text-xs font-semibold uppercase tracking-[0.1em] text-[#627067]">
              <th className="px-6 py-4">Nombre</th>
              <th className="px-6 py-4">Correo</th>
              <th className="px-6 py-4">Permisos</th>
              <th className="px-6 py-4">Registrado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E5DF]">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-[#F0EEE9]/35">
                <td className="px-6 py-4 font-semibold text-[#12241C]">
                  {u.displayName || "Sin nombre"}
                </td>
                <td className="px-6 py-4 text-[#4D5D54]">{u.email}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                      u.isAdmin
                        ? "bg-[#0F7A4D] text-white"
                        : "bg-[#F0EEE9] text-[#4D5D54]"
                    }`}
                  >
                    {u.isAdmin ? "Administrador" : "Usuario"}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-[#627067]">
                  {u.createdAt > 0 ? formatearFecha(u.createdAt) : "—"}
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
            {cargandoMas ? "Cargando…" : "Cargar más usuarios"}
          </button>
        </div>
      )}
    </div>
  );
}
