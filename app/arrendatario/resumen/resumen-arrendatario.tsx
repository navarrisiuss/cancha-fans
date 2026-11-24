"use client";

// Va en cliente porque depende de la sesión de Firebase Auth (useSesion) y maneja el estado
// interactivo del filtro por mes para consultar /api/arrendatario/metricas con fetchConSesion.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatearMonto } from "../../../components/reservas/formatos";
import { fetchConSesion } from "../../../lib/firebase/fetch-con-sesion";
import { useSesion } from "../../../lib/firebase/use-sesion";
import type { EstadoReserva } from "../../../lib/tipos/reserva";
import { formatearHora, hoyEnSantiago } from "../../../lib/zona-horaria";
import {
  FECHA_CORTE_METRICAS,
  type RespuestaMetricasArrendatario,
} from "../../api/arrendatario/metricas/contrato";

const ETIQUETAS_ESTADO: Record<EstadoReserva, { texto: string; clases: string }> = {
  pendiente_pago: { texto: "Pendiente de pago", clases: "bg-[#F0EEE9] text-[#4D5D54]" },
  pagada: { texto: "Pagada", clases: "bg-[#D9F24A] text-[#12241C]" },
  jugada: { texto: "Jugada", clases: "bg-[#0F7A4D] text-white" },
  cancelada: { texto: "Cancelada", clases: "bg-[#12241C] text-white" },
  expirada: { texto: "Expirada", clases: "bg-[#F0EEE9] text-[#627067]" },
};

const formatoPorcentaje = new Intl.NumberFormat("es-CL", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type EstadoCarga =
  | { clave: string; datos: RespuestaMetricasArrendatario; error?: never }
  | { clave: string; error: string; datos?: never };

export function ResumenArrendatario() {
  const router = useRouter();
  const { usuario, cargando } = useSesion();

  useEffect(() => {
    if (!cargando && !usuario) {
      router.replace("/iniciar-sesion?siguiente=/arrendatario/resumen");
    }
  }, [cargando, usuario, router]);

  if (cargando) {
    return (
      <p role="status" className="text-sm font-medium text-[#627067]">
        Cargando resumen…
      </p>
    );
  }

  if (!usuario) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-[#4D5D54]">Inicia sesión para ver el resumen de tus complejos.</p>
        <Link
          href="/iniciar-sesion?siguiente=/arrendatario/resumen"
          className="rounded-xl bg-[#0F7A4D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0B6840]"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return <PanelResumen key={usuario.uid} uid={usuario.uid} />;
}

// Va en cliente para mantener el filtro mensual, abortar peticiones en curso y asociar cada respuesta a uid+mes.
function PanelResumen({ uid }: { uid: string }) {
  const router = useRouter();
  const mesActual = hoyEnSantiago().slice(0, 7);
  const [mes, setMes] = useState(mesActual);
  const [intento, setIntento] = useState(0);
  const [carga, setCarga] = useState<EstadoCarga | null>(null);

  const clave = `${uid}:${mes}:${intento}`;
  const actual = carga?.clave === clave ? carga : null;

  useEffect(() => {
    const controlador = new AbortController();
    const clavePeticion = `${uid}:${mes}:${intento}`;

    (async () => {
      try {
        const respuesta = await fetchConSesion(
          `/api/arrendatario/metricas?mes=${encodeURIComponent(mes)}`,
          { signal: controlador.signal },
        );
        if (controlador.signal.aborted) return;

        if (respuesta.status === 401) {
          router.replace("/iniciar-sesion?siguiente=/arrendatario/resumen");
          return;
        }

        const cuerpo = (await respuesta.json().catch(() => null)) as
          | (RespuestaMetricasArrendatario & { error?: never })
          | { error?: string }
          | null;
        if (controlador.signal.aborted) return;

        if (!respuesta.ok || !cuerpo || !("mes" in cuerpo)) {
          setCarga({
            clave: clavePeticion,
            error: cuerpo?.error ?? "No pudimos cargar el resumen. Inténtalo de nuevo.",
          });
          return;
        }

        setCarga({ clave: clavePeticion, datos: cuerpo });
      } catch {
        if (!controlador.signal.aborted) {
          setCarga({
            clave: clavePeticion,
            error: "No pudimos cargar el resumen. Inténtalo de nuevo en unos minutos.",
          });
        }
      }
    })();

    return () => controlador.abort();
  }, [uid, mes, intento, router]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs font-medium text-[#627067]">
          Cobertura desde {FECHA_CORTE_METRICAS}: las cifras mensuales incluyen solo reservas desde esa
          fecha con duración registrada.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-[#4D5D54]">
            Mes
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value || mesActual)}
              className="rounded-xl border border-[#DAD7CF] bg-white px-3 py-2 text-sm font-medium text-[#12241C] outline-none focus:border-[#0F7A4D]"
            />
          </label>
          {mes !== mesActual && (
            <button
              type="button"
              onClick={() => setMes(mesActual)}
              className="rounded-xl border border-[#DAD7CF] px-3 py-2 text-xs font-semibold text-[#12241C] transition-colors hover:bg-[#F0EEE9]"
            >
              Mes actual
            </button>
          )}
        </div>
      </div>

      {!actual ? (
        <p role="status" className="text-sm font-medium text-[#627067]">
          Cargando métricas…
        </p>
      ) : actual.error !== undefined ? (
        <div role="alert" className="space-y-2">
          <p className="text-sm font-semibold text-[#12241C]">{actual.error}</p>
          <button
            type="button"
            onClick={() => setIntento((n) => n + 1)}
            className="text-xs font-semibold text-[#0F7A4D] hover:underline"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <section aria-label="Métricas del mes" className="space-y-4">
            {actual.datos.metricas === null ? (
              <p className="rounded-2xl border border-[#E7E5DF] bg-[#F0EEE9]/60 px-5 py-4 text-sm text-[#4D5D54]">
                Mes fuera de cobertura: las métricas mensuales están disponibles desde {actual.datos.fechaCorte}.
              </p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-2xl border border-[#E7E5DF] bg-[#F0EEE9]/45 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#627067]">
                      Reservas pagadas
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#12241C]">
                      {actual.datos.metricas.reservasPagadas.toLocaleString("es-CL")}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#E7E5DF] bg-[#F0EEE9]/45 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#627067]">
                      Ventas
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#12241C]">
                      {formatearMonto(actual.datos.metricas.ventas)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#E7E5DF] bg-[#F0EEE9]/45 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0F7A4D]">
                      Cobrado en línea
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#0F7A4D]">
                      {formatearMonto(actual.datos.metricas.cobradoEnLinea)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#E7E5DF] bg-[#F0EEE9]/45 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#627067]">
                      Canceladas
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#12241C]">
                      {actual.datos.metricas.canceladas.toLocaleString("es-CL")}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#E7E5DF] bg-[#F0EEE9]/45 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#627067]">
                      Ocupación
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#12241C]">
                      {actual.datos.metricas.ocupacion === null
                        ? "Sin horas abiertas"
                        : formatoPorcentaje.format(actual.datos.metricas.ocupacion)}
                    </p>
                  </div>
                </div>

                {actual.datos.metricas.reservasPagadas === 0 &&
                  actual.datos.metricas.canceladas === 0 && (
                    <p className="text-sm text-[#4D5D54]">
                      Sin reservas registradas dentro de la cobertura en este mes.
                    </p>
                  )}
              </>
            )}
          </section>

          <section aria-labelledby="titulo-reservas-hoy" className="space-y-3 border-t border-[#E7E5DF] pt-6">
            <h2 id="titulo-reservas-hoy" className="text-lg font-semibold text-[#12241C]">
              Reservas de hoy
            </h2>

            {actual.datos.reservasHoy.length === 0 ? (
              <p className="text-sm text-[#4D5D54]">No tienes reservas para hoy.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {actual.datos.reservasHoy.map((reserva) => {
                  const etiqueta = ETIQUETAS_ESTADO[reserva.estado];
                  return (
                    <li
                      key={reserva.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#DAD7CF] px-5 py-4"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-[#F0EEE9] px-2.5 py-0.5 text-xs font-semibold text-[#12241C]">
                            {reserva.codigo}
                          </span>
                          <p className="font-semibold text-[#12241C]">
                            {reserva.complejoNombre} · {reserva.canchaNombre}
                          </p>
                        </div>
                        <p className="text-sm text-[#4D5D54]">
                          {formatearHora(Date.parse(reserva.inicio))} a{" "}
                          {formatearHora(Date.parse(reserva.fin))} · {reserva.jugadorNombre}
                        </p>
                      </div>

                      <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${etiqueta.clases}`}>
                        {etiqueta.texto}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
