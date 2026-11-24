"use client";

// Esta sección vive en el cliente porque cambia de semana y de cancha, y maneja la selección
// de horario y la sesión durante la reserva.
import { TZDate } from "@date-fns/tz";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { DiaDisponible } from "../../lib/disponibilidad";
import { fetchConSesion } from "../../lib/firebase/fetch-con-sesion";
import { useSesion } from "../../lib/firebase/use-sesion";
import { PORCENTAJE_SENA } from "../../lib/reglas";
import type { CanchaConId } from "../../lib/tipos/cancha";
import type { TipoPago } from "../../lib/tipos/reserva";
import {
  esFechaValida,
  esHoraValida,
  formatearFechaHora,
  formatearHora,
  hoyEnSantiago,
  instanteEnSantiago,
  ZONA_HORARIA,
} from "../../lib/zona-horaria";
import { formatearMonto, montoSena } from "./formatos";
import { GrillaSemanal } from "./grilla-semanal";

// La URL no cambia mientras se está en la ficha, así que no hace falta escuchar cambios.
const sinSuscripcion = () => () => {};

type Disponibilidad = { consulta: string; intento: number } & (
  { dias: DiaDisponible[]; error?: never } | { dias?: never; error: string }
);

export function SeccionReserva({ complejoId, canchas }: { complejoId: string; canchas: CanchaConId[] }) {
  const router = useRouter();
  const { usuario, cargando } = useSesion();
  // La URL trae la fecha, la hora y el formato de la búsqueda. Se lee window.location con
  // useSyncExternalStore porque la ficha es estática (ISR). El valor null espera la hidratación
  // para hacer la primera consulta con la cancha y fecha correctas.
  const busqueda = useSyncExternalStore(sinSuscripcion, () => window.location.search, () => null);
  const parametrosUrl = new URLSearchParams(busqueda ?? "");
  const fechaUrl = parametrosUrl.get("fecha") ?? "";
  const horaUrl = parametrosUrl.get("hora") ?? "";
  const formatoUrl = parametrosUrl.get("formato");
  const [canchaId, elegirCancha] = useState("");
  const [semanaElegida, elegirSemana] = useState<string>();
  // null permite usar la hora de la URL. Una cadena vacía indica que se limpió una elección manual.
  const [inicioElegido, elegirInicio] = useState<string | null>(null);
  const [tipoPago, elegirPago] = useState<TipoPago>("total");
  const [disponibilidad, guardarDisponibilidad] = useState<Disponibilidad>();
  const [intento, cambiarIntento] = useState(0);
  const [reservando, cambiarReservando] = useState(false);
  const [errorReserva, cambiarErrorReserva] = useState<{ mensaje: string; debeActuar?: boolean }>();
  const cancha = canchas.find((cancha) => cancha.id === canchaId)
    ?? canchas.find((cancha) => cancha.formato === formatoUrl)
    ?? canchas[0];
  const hoy = busqueda === null ? "" : hoyEnSantiago();
  const fechaInicial = semanaElegida ?? (esFechaValida(fechaUrl) ? fechaUrl : hoy);
  const desde = fechaInicial >= hoy ? fechaInicial : hoy;
  const consulta = cancha && hoy
    ? new URLSearchParams({ complejoId, canchaId: cancha.id, desde }).toString()
    : "";
  const actual = disponibilidad?.consulta === consulta && disponibilidad.intento === intento
    ? disponibilidad
    : undefined;
  const diasParaElegir = inicioElegido === null
    ? actual?.dias?.filter(({ fecha }) => fecha === fechaUrl)
    : actual?.dias;
  const bloque = diasParaElegir?.flatMap(({ bloques }) => bloques).find((bloque) =>
    bloque.estado === "libre" && (inicioElegido === null
      ? esHoraValida(horaUrl) && formatearHora(Date.parse(bloque.inicio)) === horaUrl
      : bloque.inicio === inicioElegido),
  );

  useEffect(() => {
    if (!consulta) return;
    const controlador = new AbortController();

    async function cargarHorarios() {
      try {
        const respuesta = await fetch(`/api/disponibilidad/semana?${consulta}`, {
          cache: "no-store",
          signal: controlador.signal,
        });
        const datos = await respuesta.json();
        if (controlador.signal.aborted) return;
        guardarDisponibilidad(respuesta.ok
          ? { consulta, intento, dias: datos.dias }
          : { consulta, intento, error: datos.error });
      } catch {
        if (!controlador.signal.aborted) {
          guardarDisponibilidad({ consulta, intento, error: "No pudimos cargar los horarios." });
        }
      }
    }

    void cargarHorarios();
    return () => controlador.abort();
  }, [consulta, intento]);

  function volverACargar() {
    cambiarIntento((anterior) => anterior + 1);
  }

  function moverSemana(dias: number) {
    const fecha = new TZDate(instanteEnSantiago(desde, "12:00").getTime(), ZONA_HORARIA);
    fecha.setDate(fecha.getDate() + dias);
    const destino = hoyEnSantiago(fecha);
    elegirSemana(destino < hoy ? hoy : destino);
    elegirInicio("");
    cambiarErrorReserva(undefined);
    volverACargar();
  }

  function iniciarSesion() {
    const siguiente = window.location.pathname + window.location.search;
    router.push(`/iniciar-sesion?siguiente=${encodeURIComponent(siguiente)}`);
  }

  async function reservar() {
    if (!cancha || !bloque || cargando || reservando) return;
    if (!usuario) {
      iniciarSesion();
      return;
    }

    cambiarReservando(true);
    cambiarErrorReserva(undefined);
    try {
      const respuesta = await fetchConSesion("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complejoId, canchaId: cancha.id, inicio: bloque.inicio, tipoPago }),
      });
      if (respuesta.status === 401) {
        iniciarSesion();
        return;
      }
      if (respuesta.status === 409) {
        elegirInicio("");
        volverACargar();
      }
      const datos = await respuesta.json();
      if (respuesta.ok) {
        router.push(`/checkout/${encodeURIComponent(datos.reservaId)}`);
        return;
      }
      cambiarErrorReserva({
        mensaje: datos.error ?? "No pudimos crear la reserva.",
        debeActuar: respuesta.status === 409,
      });
    } catch {
      cambiarErrorReserva({ mensaje: "No pudimos crear la reserva. Intenta nuevamente." });
    } finally {
      cambiarReservando(false);
    }
  }

  const campo = "mt-1 block w-full rounded-xl border border-[#DAD7CF] bg-white px-3 py-2.5";
  return (
    <section className="space-y-5 rounded-[24px] border border-[#DAD7CF] bg-white p-5 text-[#12241C] sm:p-8">
      <h2 className="text-xl font-semibold tracking-[-0.03em]">Reservar</h2>
      {!cancha ? <p>Este complejo todavía no tiene canchas para reservar.</p> : (
        <fieldset disabled={reservando} className="min-w-0 space-y-5">
          {canchas.length > 1 && (
            <label className="block text-sm font-semibold sm:max-w-xs">
              Cancha
              <select value={cancha.id} className={campo} onChange={(evento) => {
                elegirCancha(evento.target.value);
                elegirInicio("");
                cambiarErrorReserva(undefined);
                volverACargar();
              }}>
                {canchas.map((opcion) => <option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>)}
              </select>
            </label>
          )}

          <div className="flex flex-wrap justify-between gap-2">
            <button type="button" disabled={!hoy || desde === hoy} onClick={() => moverSemana(-7)} className="rounded-xl border border-[#DAD7CF] px-3 py-2 text-sm font-semibold enabled:hover:border-[#0F7A4D] disabled:opacity-50">
              ◀ Semana anterior
            </button>
            <button type="button" disabled={!hoy} onClick={() => moverSemana(7)} className="rounded-xl border border-[#DAD7CF] px-3 py-2 text-sm font-semibold enabled:hover:border-[#0F7A4D] disabled:opacity-50">
              Semana siguiente ▶
            </button>
          </div>

          {!actual && <p role="status" className="text-sm">Cargando horarios…</p>}
          {actual?.error && (
            <div role="alert" className="text-sm">
              <p>{actual.error}</p>
              <button type="button" onClick={volverACargar} className="mt-1 font-semibold underline">Volver a intentar</button>
            </div>
          )}
          {actual?.dias && (
            <GrillaSemanal dias={actual.dias} inicioElegido={bloque?.inicio} elegirInicio={(inicio) => {
              elegirInicio(inicio);
              cambiarErrorReserva(undefined);
            }} />
          )}

          <div aria-live="polite" className="flex flex-wrap justify-between gap-x-4 gap-y-1 rounded-xl bg-[#F0EEE9] px-4 py-3 text-sm">
            <p>{bloque
              ? `${cancha.nombre} · ${formatearFechaHora(Date.parse(bloque.inicio))}–${formatearHora(Date.parse(bloque.fin))}`
              : "Elige un horario para reservar."}</p>
            <p className="font-semibold">{formatearMonto(cancha.precioPorBloque)} por bloque</p>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold">Forma de pago</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="tipoPago" checked={tipoPago === "total"} onChange={() => elegirPago("total")} className="accent-[#0F7A4D]" />
              Pagar el total ({formatearMonto(cancha.precioPorBloque)})
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="tipoPago" checked={tipoPago === "sena"} onChange={() => elegirPago("sena")} className="accent-[#0F7A4D]" />
              Pagar una seña del {PORCENTAJE_SENA}% ({formatearMonto(montoSena(cancha.precioPorBloque))})
            </label>
          </fieldset>

          {errorReserva && (
            <p role="alert" className={errorReserva.debeActuar ? "text-sm text-[#A8302D]" : "text-sm"}>
              {errorReserva.mensaje}
            </p>
          )}
          <button
            type="button"
            disabled={!bloque || cargando}
            onClick={() => void reservar()}
            className="w-full rounded-xl bg-[#0F7A4D] px-4 py-3 font-semibold text-white enabled:hover:bg-[#0B6840] disabled:opacity-50"
          >
            {reservando ? "Reservando…" : "Reservar y pagar"}
          </button>
        </fieldset>
      )}
    </section>
  );
}
