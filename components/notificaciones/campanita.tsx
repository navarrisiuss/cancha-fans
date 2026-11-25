"use client";

// Campanita de notificaciones del encabezado. Va en cliente porque usa la sesión de Firebase Auth
// (useSesion), obtiene el contador de no leídas con count() desde el navegador y maneja la apertura
// del menú desplegable con las últimas notificaciones.
import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  query,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { db } from "../../lib/firebase/client";
import { useSesion } from "../../lib/firebase/use-sesion";
import type { TipoNotificacion } from "../../lib/tipos/notificacion";
import { formatearFechaHora } from "../../lib/zona-horaria";

type NotificacionMenu = {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  enlace: string;
  leida: boolean;
  creadaMs: number;
};

const MAX_ULTIMAS = 5;

export function Campanita({ claro = false }: { claro?: boolean }) {
  const router = useRouter();
  const { usuario, cargando } = useSesion();
  const [noLeidas, setNoLeidas] = useState<number>(0);
  const [abierto, setAbierto] = useState(false);
  const [ultimas, setUltimas] = useState<NotificacionMenu[] | null>(null);
  const [cargandoLista, setCargandoLista] = useState(false);
  const contenedorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (cargando || !usuario) return;

    let cancelado = false;
    (async () => {
      try {
        // Obtiene la cantidad de no leídas con count() sobre userId + leida == false, sin descargar
        // todos los documentos de la colección.
        const consultaConteo = query(
          collection(db, "notificaciones"),
          where("userId", "==", usuario.uid),
          where("leida", "==", false),
        );
        const snap = await getCountFromServer(consultaConteo);
        if (!cancelado) {
          setNoLeidas(snap.data().count);
        }
      } catch {
        // Si falla la consulta de conteo no interrumpimos el encabezado.
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [cargando, usuario]);

  useEffect(() => {
    if (!abierto) return;
    function manejarClicExterior(evento: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", manejarClicExterior);
    return () => document.removeEventListener("mousedown", manejarClicExterior);
  }, [abierto]);

  if (cargando || !usuario) {
    return null;
  }

  async function alternarMenu() {
    const siguiente = !abierto;
    setAbierto(siguiente);
    if (!siguiente || !usuario) return;

    setCargandoLista(true);
    try {
      const snap = await getDocs(
        query(collection(db, "notificaciones"), where("userId", "==", usuario.uid)),
      );
      const lista: NotificacionMenu[] = snap.docs
        .map((d) => {
          const datos = d.data();
          return {
            id: d.id,
            tipo: datos.tipo as TipoNotificacion,
            titulo: String(datos.titulo ?? ""),
            mensaje: String(datos.mensaje ?? ""),
            enlace: String(datos.enlace ?? "/notificaciones"),
            leida: Boolean(datos.leida),
            creadaMs: (datos.createdAt as Timestamp | undefined)?.toMillis() ?? 0,
          };
        })
        .sort((a, b) => b.creadaMs - a.creadaMs);

      setNoLeidas(lista.filter((n) => !n.leida).length);
      setUltimas(lista.slice(0, MAX_ULTIMAS));
    } catch {
      setUltimas([]);
    }
    setCargandoLista(false);
  }

  async function abrirNotificacion(item: NotificacionMenu) {
    setAbierto(false);
    if (!item.leida) {
      setUltimas((actual) =>
        actual ? actual.map((n) => (n.id === item.id ? { ...n, leida: true } : n)) : actual,
      );
      setNoLeidas((actual) => Math.max(0, actual - 1));
      try {
        await updateDoc(doc(db, "notificaciones", item.id), { leida: true });
      } catch {
        // Si falla la actualización seguimos navegando al enlace.
      }
    }
    router.push(item.enlace);
  }

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={() => void alternarMenu()}
        aria-label={
          noLeidas > 0 ? `Notificaciones (${noLeidas} sin leer)` : "Notificaciones"
        }
        aria-expanded={abierto}
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
          claro
            ? "text-white hover:bg-white/10"
            : "text-[#12241C] hover:bg-[#F0EEE9]"
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {noLeidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#0F7A4D] px-1 text-[11px] font-semibold text-white">
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        // En celular la campanita puede quedar a la izquierda del encabezado: el menú se ancla a
        // los bordes de la pantalla (fixed sin top queda bajo el botón) para que no se salga.
        <div className="fixed inset-x-4 z-50 mt-2 overflow-hidden rounded-2xl border border-[#DAD7CF] bg-white text-[#12241C] shadow-[0_24px_70px_rgba(18,36,28,0.18)] sm:absolute sm:left-auto sm:right-0 sm:w-80">
          <div className="flex items-center justify-between border-b border-[#E7E5DF] px-4 py-3">
            <span className="text-sm font-semibold">Notificaciones</span>
            {noLeidas > 0 && (
              <span className="text-xs font-semibold text-[#0F7A4D]">{noLeidas} sin leer</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {cargandoLista ? (
              <p className="px-4 py-6 text-center text-xs font-medium text-[#627067]">
                Cargando notificaciones…
              </p>
            ) : !ultimas || ultimas.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs font-medium text-[#627067]">
                No tienes notificaciones todavía.
              </p>
            ) : (
              <ul className="divide-y divide-[#E7E5DF]">
                {ultimas.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void abrirNotificacion(item)}
                      className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-[#F0EEE9]/60 ${
                        item.leida ? "bg-white" : "bg-[#F0EEE9]/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-[#12241C]">{item.titulo}</span>
                        {!item.leida && (
                          <span
                            aria-label="Sin leer"
                            className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#0F7A4D]"
                          />
                        )}
                      </div>
                      <p className="line-clamp-2 text-xs text-[#4D5D54]">{item.mensaje}</p>
                      {item.creadaMs > 0 && (
                        <span className="text-[11px] font-medium text-[#627067]">
                          {formatearFechaHora(item.creadaMs)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-[#E7E5DF] bg-[#F0EEE9]/40 px-4 py-2.5 text-center">
            <Link
              href="/notificaciones"
              onClick={() => setAbierto(false)}
              className="text-xs font-semibold text-[#0F7A4D] hover:underline"
            >
              Ver todo el historial
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
