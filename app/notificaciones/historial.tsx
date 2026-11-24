"use client";

// Componente cliente: requiere la sesión de Firebase Auth (useSesion), lee las notificaciones del
// usuario desde Firestore y marca leida: true desde el navegador según permiten las security rules.
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "../../lib/firebase/client";
import { useSesion } from "../../lib/firebase/use-sesion";
import type { TipoNotificacion } from "../../lib/tipos/notificacion";
import { formatearFechaHora } from "../../lib/zona-horaria";

type NotificacionItem = {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  enlace: string;
  leida: boolean;
  creadaMs: number;
};

export function HistorialNotificaciones() {
  const router = useRouter();
  const { usuario, cargando } = useSesion();
  const [notificaciones, setNotificaciones] = useState<NotificacionItem[] | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [marcandoId, setMarcandoId] = useState<string | null>(null);

  useEffect(() => {
    if (cargando) return;
    if (!usuario) {
      router.replace("/iniciar-sesion?siguiente=/notificaciones");
      return;
    }

    let cancelado = false;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "notificaciones"), where("userId", "==", usuario.uid)),
        );
        if (cancelado) return;

        const lista: NotificacionItem[] = snap.docs
          .map((d) => {
            const datos = d.data();
            return {
              id: d.id,
              tipo: datos.tipo as TipoNotificacion,
              titulo: String(datos.titulo ?? ""),
              mensaje: String(datos.mensaje ?? ""),
              enlace: String(datos.enlace ?? "/"),
              leida: Boolean(datos.leida),
              creadaMs: (datos.createdAt as Timestamp | undefined)?.toMillis() ?? 0,
            };
          })
          .sort((a, b) => b.creadaMs - a.creadaMs);

        setNotificaciones(lista);
      } catch {
        if (!cancelado) setErrorCarga(true);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [cargando, usuario, router]);

  if (errorCarga) {
    return (
      <p role="alert" className="text-sm font-semibold text-[#12241C]">
        No pudimos cargar tus notificaciones. Inténtalo de nuevo en unos minutos.
      </p>
    );
  }

  if (!notificaciones) {
    return <p className="text-sm font-medium text-[#627067]">Cargando notificaciones…</p>;
  }

  if (notificaciones.length === 0) {
    return (
      <p className="text-sm text-[#4D5D54]">
        Todavía no tienes notificaciones en tu historial.
      </p>
    );
  }

  async function marcarComoLeida(id: string) {
    setMarcandoId(id);
    try {
      // Las security rules solo permiten actualizar el campo `leida` en notificaciones propias.
      await updateDoc(doc(db, "notificaciones", id), { leida: true });
      setNotificaciones((actual) =>
        actual ? actual.map((n) => (n.id === id ? { ...n, leida: true } : n)) : actual,
      );
    } catch {
      // Fallo silencioso o transitorio de red.
    }
    setMarcandoId(null);
  }

  return (
    <ul className="flex flex-col gap-3">
      {notificaciones.map((n) => (
        <li
          key={n.id}
          className={`flex flex-col justify-between gap-4 rounded-2xl border border-[#DAD7CF] p-5 sm:flex-row sm:items-center ${
            n.leida ? "bg-white" : "bg-[#F0EEE9]/50"
          }`}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-[#12241C]">{n.titulo}</p>
              {!n.leida && (
                <span className="rounded-full bg-[#0F7A4D] px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  Nueva
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-[#4D5D54]">{n.mensaje}</p>
            {n.creadaMs > 0 && (
              <p className="mt-1.5 text-xs font-medium text-[#627067]">
                {formatearFechaHora(n.creadaMs)}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!n.leida && (
              <button
                type="button"
                disabled={marcandoId === n.id}
                onClick={() => void marcarComoLeida(n.id)}
                className="rounded-xl border border-[#DAD7CF] bg-white px-3.5 py-2 text-xs font-semibold text-[#12241C] transition-colors hover:bg-[#F0EEE9] disabled:opacity-60"
              >
                {marcandoId === n.id ? "Marcando…" : "Marcar como leída"}
              </button>
            )}
            <Link
              href={n.enlace}
              onClick={() => {
                if (!n.leida) void marcarComoLeida(n.id);
              }}
              className="rounded-xl bg-[#0F7A4D] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0B6840]"
            >
              Ver detalle
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
