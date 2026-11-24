"use client";

// Componente cliente: requiere la sesión de Firebase Auth (useSesion), consulta los complejos,
// canchas y bloqueos del dueño en Firestore y envía creaciones o bajas a /api/bloqueos.
import { collection, getDocs, query, where, type Timestamp } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { db } from "../../../lib/firebase/client";
import type { MensajeError } from "../../../lib/firebase/errores-auth";
import { fetchConSesion } from "../../../lib/firebase/fetch-con-sesion";
import { useSesion } from "../../../lib/firebase/use-sesion";
import type { Formato } from "../../../lib/tipos/cancha";
import { formatearFechaHora, formatearHora, hoyEnSantiago } from "../../../lib/zona-horaria";

type OpcionCancha = {
  complejoId: string;
  complejoNombre: string;
  canchaId: string;
  canchaNombre: string;
  formato: Formato;
};

type BloqueoItem = {
  id: string;
  complejoId: string;
  canchaId: string;
  inicioMs: number;
  finMs: number;
  motivo: string;
};

const MOTIVOS_SUGERIDOS = ["Mantención", "Evento privado", "Lluvia"] as const;

const clasesInput =
  "rounded-xl border border-[#DAD7CF] bg-white px-4 py-2.5 text-sm font-medium text-[#12241C] outline-none focus:border-[#0F7A4D]";

export function GestionBloqueos() {
  const router = useRouter();
  const { usuario, cargando } = useSesion();
  const [canchas, setCanchas] = useState<OpcionCancha[] | null>(null);
  const [bloqueos, setBloqueos] = useState<BloqueoItem[] | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);

  const [seleccionCancha, setSeleccionCancha] = useState("");
  const [fecha, setFecha] = useState(() => hoyEnSantiago());
  const [horaInicio, setHoraInicio] = useState("18:00");
  const [horaFin, setHoraFin] = useState("20:00");
  const [motivo, setMotivo] = useState("Mantención");
  const [enviando, setEnviando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [errorFormulario, setErrorFormulario] = useState<MensajeError | null>(null);

  useEffect(() => {
    if (cargando) return;
    if (!usuario) {
      router.replace("/iniciar-sesion?siguiente=/arrendatario/bloqueos");
      return;
    }

    let cancelado = false;
    (async () => {
      try {
        const [complejosSnap, bloqueosSnap] = await Promise.all([
          getDocs(query(collection(db, "complejos"), where("ownerId", "==", usuario.uid))),
          getDocs(query(collection(db, "bloqueos"), where("ownerId", "==", usuario.uid))),
        ]);

        const opcionesPorComplejo = await Promise.all(
          complejosSnap.docs.map(async (compDoc) => {
            const nombreComplejo = String(compDoc.data().nombre ?? "");
            const canchasSnap = await getDocs(collection(compDoc.ref, "canchas"));
            return canchasSnap.docs.map((canchaDoc) => ({
              complejoId: compDoc.id,
              complejoNombre: nombreComplejo,
              canchaId: canchaDoc.id,
              canchaNombre: String(canchaDoc.data().nombre ?? ""),
              formato: canchaDoc.data().formato as Formato,
            }));
          }),
        );

        if (cancelado) return;

        const todasLasCanchas = opcionesPorComplejo.flat();
        setCanchas(todasLasCanchas);
        if (todasLasCanchas.length > 0) {
          setSeleccionCancha(`${todasLasCanchas[0].complejoId}::${todasLasCanchas[0].canchaId}`);
        }

        const listaBloqueos: BloqueoItem[] = bloqueosSnap.docs
          .map((d) => {
            const datos = d.data();
            return {
              id: d.id,
              complejoId: String(datos.complejoId ?? ""),
              canchaId: String(datos.canchaId ?? ""),
              inicioMs: (datos.inicio as Timestamp | undefined)?.toMillis() ?? 0,
              finMs: (datos.fin as Timestamp | undefined)?.toMillis() ?? 0,
              motivo: String(datos.motivo ?? ""),
            };
          })
          .sort((a, b) => b.inicioMs - a.inicioMs);

        setBloqueos(listaBloqueos);
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
        No pudimos cargar tus canchas y bloqueos. Inténtalo de nuevo en unos minutos.
      </p>
    );
  }

  if (!canchas || !bloqueos) {
    return <p className="text-sm font-medium text-[#627067]">Cargando canchas y bloqueos…</p>;
  }

  if (canchas.length === 0) {
    return (
      <div className="flex flex-col gap-3 text-sm text-[#4D5D54]">
        <p>Para bloquear horarios primero necesitas tener un complejo con al menos una cancha creada.</p>
        <Link href="/arrendatario/complejos" className="font-semibold text-[#0F7A4D] hover:underline">
          Ir a mis complejos →
        </Link>
      </div>
    );
  }

  const mapaCanchas = new Map<string, OpcionCancha>(
    canchas.map((c) => [`${c.complejoId}::${c.canchaId}`, c]),
  );

  async function crearBloqueo(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const [complejoId, canchaId] = seleccionCancha.split("::");
    if (!complejoId || !canchaId) {
      setErrorFormulario({ texto: "Selecciona una cancha.", debeActuar: true });
      return;
    }
    if (!motivo.trim()) {
      setErrorFormulario({ texto: "Escribe el motivo del bloqueo.", debeActuar: true });
      return;
    }

    setErrorFormulario(null);
    setEnviando(true);
    try {
      const respuesta = await fetchConSesion("/api/bloqueos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complejoId,
          canchaId,
          fecha,
          horaInicio,
          horaFin,
          motivo: motivo.trim(),
        }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        setErrorFormulario({
          texto: datos.error ?? "No pudimos crear el bloqueo.",
          debeActuar: respuesta.status === 400 || respuesta.status === 409,
        });
        setEnviando(false);
        return;
      }

      const nuevo: BloqueoItem = {
        id: datos.id,
        complejoId,
        canchaId,
        inicioMs: new Date(datos.inicio).getTime(),
        finMs: new Date(datos.fin).getTime(),
        motivo: datos.motivo,
      };
      setBloqueos((actual) =>
        actual ? [nuevo, ...actual].sort((a, b) => b.inicioMs - a.inicioMs) : [nuevo],
      );
      setEnviando(false);
    } catch {
      setErrorFormulario({
        texto: "No pudimos guardar el bloqueo. Revisa tu conexión e inténtalo de nuevo.",
        debeActuar: false,
      });
      setEnviando(false);
    }
  }

  async function quitarBloqueo(id: string) {
    setErrorFormulario(null);
    setEliminandoId(id);
    try {
      const respuesta = await fetchConSesion(`/api/bloqueos?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        setErrorFormulario({
          texto: datos.error ?? "No pudimos quitar el bloqueo.",
          debeActuar: false,
        });
      } else {
        setBloqueos((actual) => (actual ? actual.filter((b) => b.id !== id) : actual));
      }
    } catch {
      setErrorFormulario({
        texto: "No pudimos quitar el bloqueo. Revisa tu conexión e inténtalo de nuevo.",
        debeActuar: false,
      });
    }
    setEliminandoId(null);
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={crearBloqueo}
        className="flex flex-col gap-4 rounded-2xl border border-[#DAD7CF] bg-[#F0EEE9]/45 p-5"
      >
        <h2 className="text-base font-semibold text-[#12241C]">Nuevo bloqueo</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#12241C] sm:col-span-2">
            Cancha
            <select
              value={seleccionCancha}
              onChange={(e) => setSeleccionCancha(e.target.value)}
              className={clasesInput}
            >
              {canchas.map((c) => {
                const clave = `${c.complejoId}::${c.canchaId}`;
                return (
                  <option key={clave} value={clave}>
                    {c.complejoNombre} · {c.canchaNombre} ({c.formato})
                  </option>
                );
              })}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#12241C]">
            Fecha
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={clasesInput}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#12241C]">
              Hora inicio
              <input
                type="time"
                required
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className={clasesInput}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#12241C]">
              Hora fin
              <input
                type="time"
                required
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className={clasesInput}
              />
            </label>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#12241C]">
              Motivo
              <input
                type="text"
                required
                maxLength={200}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej. Mantención, evento privado, lluvia"
                className={clasesInput}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-medium text-[#627067]">Sugerencias:</span>
              {MOTIVOS_SUGERIDOS.map((sugerido) => (
                <button
                  key={sugerido}
                  type="button"
                  onClick={() => setMotivo(sugerido)}
                  className="rounded-lg border border-[#DAD7CF] bg-white px-2.5 py-1 text-xs font-semibold text-[#12241C] transition-colors hover:bg-[#F0EEE9]"
                >
                  {sugerido}
                </button>
              ))}
            </div>
          </div>
        </div>

        {errorFormulario && (
          <p
            role="alert"
            className={`text-sm font-semibold ${
              errorFormulario.debeActuar ? "text-[#A8302D]" : "text-[#12241C]"
            }`}
          >
            {errorFormulario.texto}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={enviando}
            className="rounded-xl bg-[#0F7A4D] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0B6840] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? "Bloqueando…" : "Bloquear horario"}
          </button>
        </div>
      </form>

      <div>
        <h2 className="text-base font-semibold text-[#12241C]">Bloqueos registrados</h2>
        {bloqueos.length === 0 ? (
          <p className="mt-3 text-sm text-[#4D5D54]">No tienes bloqueos manuales activos.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {bloqueos.map((b) => {
              const info = mapaCanchas.get(`${b.complejoId}::${b.canchaId}`);
              return (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#DAD7CF] px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[#12241C]">
                      {info
                        ? `${info.complejoNombre} · ${info.canchaNombre} (${info.formato})`
                        : `Cancha ${b.canchaId}`}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-[#4D5D54]">
                      {formatearFechaHora(b.inicioMs)} a {formatearHora(b.finMs)}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-[#627067]">Motivo: {b.motivo}</p>
                  </div>

                  <button
                    type="button"
                    disabled={eliminandoId === b.id}
                    onClick={() => void quitarBloqueo(b.id)}
                    className="shrink-0 rounded-xl border border-[#DAD7CF] px-3.5 py-2 text-xs font-semibold text-[#12241C] transition-colors hover:bg-[#F0EEE9] disabled:opacity-60"
                  >
                    {eliminandoId === b.id ? "Quitando…" : "Quitar bloqueo"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
