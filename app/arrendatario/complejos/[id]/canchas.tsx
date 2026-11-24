"use client";

// Componente cliente: requiere la sesión de Firebase Auth (useSesion), lee el complejo y sus
// canchas desde Firestore con el SDK cliente y coordina las acciones de crear, editar y activar.
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "../../../../lib/firebase/client";
import type { EstadoComplejo } from "../../../../lib/firebase/complejos";
import type { MensajeError } from "../../../../lib/firebase/errores-auth";
import { fetchConSesion } from "../../../../lib/firebase/fetch-con-sesion";
import { useSesion } from "../../../../lib/firebase/use-sesion";
import {
  DIAS_SEMANA,
  type CanchaConId,
  type DiaSemana,
  type Formato,
  type HorarioAtencion,
  type Superficie,
} from "../../../../lib/tipos/cancha";
import { FormularioCancha } from "./formulario-cancha";

type InfoComplejo = {
  id: string;
  nombre: string;
  comuna: string;
  estado: EstadoComplejo;
  formatosDisponibles: Formato[];
};

const ESTADOS_COMPLEJO: Record<EstadoComplejo, { texto: string; clases: string }> = {
  borrador: { texto: "Borrador", clases: "bg-[#F0EEE9] text-[#627067]" },
  en_revision: { texto: "En revisión", clases: "bg-[#F0EEE9] text-[#4D5D54]" },
  aprobado: { texto: "Aprobado", clases: "bg-[#0F7A4D] text-white" },
  rechazado: { texto: "Rechazado", clases: "bg-[#12241C] text-white" },
};

const TEXTO_SUPERFICIE: Record<Superficie, string> = {
  sintetico: "Pasto sintético",
  pasto_natural: "Pasto natural",
};

const ABREVIATURA_DIA: Record<DiaSemana, string> = {
  lunes: "Lun",
  martes: "Mar",
  miercoles: "Mié",
  jueves: "Jue",
  viernes: "Vie",
  sabado: "Sáb",
  domingo: "Dom",
};

function resumirHorario(horario: HorarioAtencion): string {
  const abiertos = DIAS_SEMANA.filter((d) => horario[d] !== null);
  if (abiertos.length === 0) return "Sin días abiertos";
  const primero = horario[abiertos[0]];
  const todosIguales = abiertos.every(
    (d) => horario[d]?.abre === primero?.abre && horario[d]?.cierra === primero?.cierra,
  );
  const diasTexto = abiertos.map((d) => ABREVIATURA_DIA[d]).join(", ");
  if (todosIguales && primero) {
    return `${diasTexto} · ${primero.abre} a ${primero.cierra}`;
  }
  return `${abiertos.length} días abiertos`;
}

export function GestionCanchasComplejo({ complejoId }: { complejoId: string }) {
  const router = useRouter();
  const { usuario, cargando } = useSesion();
  const [complejo, setComplejo] = useState<InfoComplejo | null>(null);
  const [canchas, setCanchas] = useState<CanchaConId[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [cambiandoId, setCambiandoId] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<MensajeError | null>(null);

  useEffect(() => {
    if (cargando) return;
    if (!usuario) {
      router.replace(`/iniciar-sesion?siguiente=${encodeURIComponent(`/arrendatario/complejos/${complejoId}`)}`);
      return;
    }

    let cancelado = false;
    (async () => {
      try {
        const complejoRef = doc(db, "complejos", complejoId);
        const complejoSnap = await getDoc(complejoRef);
        if (!complejoSnap.exists()) {
          if (!cancelado) setErrorCarga("Este complejo no existe.");
          return;
        }
        const datos = complejoSnap.data();
        if (datos.ownerId !== usuario.uid) {
          if (!cancelado) setErrorCarga("Este complejo no es tuyo.");
          return;
        }

        const canchasSnap = await getDocs(collection(complejoRef, "canchas"));
        if (cancelado) return;

        setComplejo({
          id: complejoSnap.id,
          nombre: datos.nombre,
          comuna: datos.comuna,
          estado: datos.estado,
          formatosDisponibles: (datos.formatosDisponibles as Formato[] | undefined) ?? [],
        });

        const lista: CanchaConId[] = canchasSnap.docs.map((d) => {
          const c = d.data();
          return {
            id: d.id,
            nombre: c.nombre,
            formato: c.formato,
            superficie: c.superficie,
            techada: Boolean(c.techada),
            precioPorBloque: Number(c.precioPorBloque),
            duracionBloqueMin: Number(c.duracionBloqueMin),
            horarioAtencion: c.horarioAtencion as HorarioAtencion,
            activa: Boolean(c.activa),
          };
        });
        setCanchas(lista);
      } catch {
        if (!cancelado) {
          setErrorCarga("No pudimos cargar las canchas del complejo. Inténtalo de nuevo en unos minutos.");
        }
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [cargando, usuario, complejoId, router]);

  if (errorCarga) {
    return (
      <p role="alert" className="text-sm font-semibold text-[#12241C]">
        {errorCarga}
      </p>
    );
  }

  if (!complejo || !canchas) {
    return <p className="text-sm font-medium text-[#627067]">Cargando complejo y canchas…</p>;
  }

  const puedeModificar = complejo.estado === "en_revision" || complejo.estado === "aprobado";

  async function alternarActiva(cancha: CanchaConId) {
    setErrorAccion(null);
    setCambiandoId(cancha.id);
    try {
      const respuesta = await fetchConSesion(
        `/api/complejos/${encodeURIComponent(complejoId)}/canchas/${encodeURIComponent(cancha.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activa: !cancha.activa }),
        },
      );
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        setErrorAccion({
          texto: datos.error ?? "No pudimos actualizar el estado de la cancha.",
          debeActuar: respuesta.status === 400,
        });
      } else {
        const actualizada = datos.cancha as CanchaConId;
        const formatos = datos.formatosDisponibles as Formato[];
        setCanchas((actual) => actual && actual.map((c) => (c.id === cancha.id ? actualizada : c)));
        setComplejo((actual) => actual && { ...actual, formatosDisponibles: formatos });
      }
    } catch {
      setErrorAccion({
        texto: "No pudimos actualizar la cancha. Revisa tu conexión e inténtalo de nuevo.",
        debeActuar: false,
      });
    }
    setCambiandoId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E7E5DF] pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#12241C]">{complejo.nombre}</h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${ESTADOS_COMPLEJO[complejo.estado].clases}`}
            >
              {ESTADOS_COMPLEJO[complejo.estado].texto}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-[#627067]">
            {complejo.comuna}
            {complejo.formatosDisponibles.length > 0
              ? ` · Formatos activos: ${complejo.formatosDisponibles.join(", ")}`
              : " · Sin formatos activos"}
          </p>
        </div>

        {puedeModificar && !creando && editandoId === null && (
          <button
            type="button"
            onClick={() => {
              setErrorAccion(null);
              setCreando(true);
            }}
            className="rounded-xl bg-[#0F7A4D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0B6840]"
          >
            Agregar cancha
          </button>
        )}
      </div>

      {!puedeModificar && (
        <p className="rounded-xl bg-[#F0EEE9] px-4 py-3 text-sm font-medium text-[#12241C]">
          Las canchas solo se pueden crear o modificar cuando el complejo está en revisión o aprobado.
        </p>
      )}

      {errorAccion && (
        <p
          role="alert"
          className={`text-sm font-semibold ${errorAccion.debeActuar ? "text-[#A8302D]" : "text-[#12241C]"}`}
        >
          {errorAccion.texto}
        </p>
      )}

      {creando && (
        <FormularioCancha
          complejoId={complejo.id}
          alCancelar={() => setCreando(false)}
          alGuardar={(nueva, formatosDisponibles) => {
            setCanchas((actual) => (actual ? [...actual, nueva] : [nueva]));
            setComplejo((actual) => actual && { ...actual, formatosDisponibles });
            setCreando(false);
          }}
        />
      )}

      {canchas.length === 0 && !creando ? (
        <div className="rounded-2xl border border-[#DAD7CF] px-6 py-8 text-center">
          <p className="text-sm font-medium text-[#4D5D54]">
            Todavía no has agregado canchas a este complejo.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {canchas.map((cancha) => (
            <li key={cancha.id} className="rounded-2xl border border-[#DAD7CF] p-5">
              {editandoId === cancha.id ? (
                <FormularioCancha
                  complejoId={complejo.id}
                  canchaInicial={cancha}
                  alCancelar={() => setEditandoId(null)}
                  alGuardar={(actualizada, formatosDisponibles) => {
                    setCanchas((actual) =>
                      actual ? actual.map((c) => (c.id === actualizada.id ? actualizada : c)) : [actualizada],
                    );
                    setComplejo((actual) => actual && { ...actual, formatosDisponibles });
                    setEditandoId(null);
                  }}
                />
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#12241C]">
                        {complejo.nombre} · {cancha.nombre}
                      </p>
                      <span className="rounded-full bg-[#F0EEE9] px-2.5 py-0.5 text-xs font-semibold text-[#12241C]">
                        {cancha.formato}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          cancha.activa ? "bg-[#0F7A4D] text-white" : "bg-[#F0EEE9] text-[#627067]"
                        }`}
                      >
                        {cancha.activa ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-[#4D5D54]">
                      {TEXTO_SUPERFICIE[cancha.superficie]} · {cancha.techada ? "Techada" : "Descubierta"} ·{" "}
                      {cancha.precioPorBloque.toLocaleString("es-CL", {
                        style: "currency",
                        currency: "CLP",
                      })}{" "}
                      por bloque de {cancha.duracionBloqueMin} min
                    </p>
                    <p className="mt-1 text-xs font-medium text-[#627067]">
                      {resumirHorario(cancha.horarioAtencion)}
                    </p>
                  </div>

                  {puedeModificar && (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        disabled={cambiandoId === cancha.id}
                        onClick={() => {
                          setErrorAccion(null);
                          setCreando(false);
                          setEditandoId(cancha.id);
                        }}
                        className="rounded-xl border border-[#DAD7CF] px-3.5 py-2 text-xs font-semibold text-[#12241C] transition-colors hover:bg-[#F0EEE9] disabled:opacity-60"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={cambiandoId === cancha.id}
                        onClick={() => void alternarActiva(cancha)}
                        className="rounded-xl border border-[#DAD7CF] px-3.5 py-2 text-xs font-semibold text-[#12241C] transition-colors hover:bg-[#F0EEE9] disabled:opacity-60"
                      >
                        {cambiandoId === cancha.id
                          ? "Guardando…"
                          : cancha.activa
                            ? "Desactivar"
                            : "Activar"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
