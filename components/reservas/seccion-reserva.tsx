"use client";

// La selección es interactiva y la disponibilidad fresca se pide desde el navegador al elegir fecha.
// La ficha pública monta esta sección con su contrato de complejo y canchas.
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { BloqueDisponible } from "../../lib/disponibilidad";
import { fetchConSesion } from "../../lib/firebase/fetch-con-sesion";
import { useSesion } from "../../lib/firebase/use-sesion";
import { PORCENTAJE_SENA } from "../../lib/reglas";
import type { CanchaConId } from "../../lib/tipos/cancha";
import type { TipoPago } from "../../lib/tipos/reserva";
import { esFechaValida, esHoraValida, formatearHora, hoyEnSantiago } from "../../lib/zona-horaria";
import { formatearMonto, montoSena } from "./formatos";

// La URL no cambia mientras se está en la ficha, así que no hace falta escuchar cambios.
const sinSuscripcion = () => () => {};

type Disponibilidad ={ consulta: string; intento: number } & (
  { bloques: BloqueDisponible[]; error?: never } | { bloques?: never; error: string }
);

export function SeccionReserva({ complejoId, canchas }: { complejoId: string; canchas: CanchaConId[] }) {
  const router = useRouter();
  const { usuario, cargando } = useSesion();
  // La URL trae la fecha, la hora y el formato de la búsqueda. Se lee window.location con
  // useSyncExternalStore (en el servidor la búsqueda vale "") porque la ficha es estática (ISR)
  // y useSearchParams obligaría a envolverla en un Suspense.
  const busqueda = useSyncExternalStore(sinSuscripcion, () => window.location.search, () => "");
  const parametrosUrl = new URLSearchParams(busqueda);
  const fechaUrl = parametrosUrl.get("fecha") ?? "";
  const horaUrl = parametrosUrl.get("hora") ?? "";
  const formatoUrl = parametrosUrl.get("formato");
  const [canchaId, elegirCancha] = useState("");
  const [fechaElegida, elegirFecha] = useState<string | null>(null);
  const fecha = fechaElegida ?? (esFechaValida(fechaUrl) && fechaUrl >= hoyEnSantiago() ? fechaUrl : "");
  // null permite usar la hora de la URL. Una cadena vacía indica que se limpió una elección manual.
  const [inicioElegido, elegirInicio] = useState<string | null>(null);
  const [tipoPago, elegirPago] = useState<TipoPago>("total");
  const [disponibilidad, guardarDisponibilidad] = useState<Disponibilidad>();
  const [intento, cambiarIntento] = useState(0);
  const [reservando, cambiarReservando] = useState(false);
  const [errorReserva, cambiarErrorReserva] = useState("");
  const cancha = canchas.find((cancha) => cancha.id === canchaId)
    ?? canchas.find((cancha) => cancha.formato === formatoUrl)
    ?? canchas[0];
  const hoy = hoyEnSantiago();
  const consulta = cancha && fecha && fecha >= hoy
    ? new URLSearchParams({ complejoId, canchaId: cancha.id, fecha }).toString()
    : "";
  const actual = disponibilidad?.consulta === consulta && disponibilidad.intento === intento
    ? disponibilidad
    : undefined;
  const bloque = actual?.bloques?.find((bloque) =>
    bloque.estado === "libre" && (inicioElegido === null
      ? esHoraValida(horaUrl) && formatearHora(Date.parse(bloque.inicio)) === horaUrl
      : bloque.inicio === inicioElegido),
  );

  useEffect(() => {
    if (!consulta) return;
    const controlador = new AbortController();

    async function cargarHorarios() {
      try {
        const respuesta = await fetch(`/api/disponibilidad?${consulta}`, {
          cache: "no-store",
          signal: controlador.signal,
        });
        const datos = await respuesta.json();
        if (controlador.signal.aborted) return;
        guardarDisponibilidad(respuesta.ok
          ? { consulta, intento, bloques: datos.bloques }
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
    elegirInicio((anterior) => anterior === null ? null : "");
    cambiarIntento((anterior) => anterior + 1);
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
    cambiarErrorReserva("");
    try {
      const respuesta = await fetchConSesion("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complejoId, canchaId: cancha.id, inicio: bloque.inicio, tipoPago }),
      });
      const datos = await respuesta.json();
      if (respuesta.ok) {
        router.push(`/checkout/${encodeURIComponent(datos.reservaId)}`);
        return;
      }
      if (respuesta.status === 401) iniciarSesion();
      if (respuesta.status === 409) volverACargar();
      cambiarErrorReserva(datos.error ?? "No pudimos crear la reserva.");
    } catch {
      cambiarErrorReserva("No pudimos crear la reserva. Intenta nuevamente.");
    }
    cambiarReservando(false);
  }

  const campo = "mt-1 block w-full rounded-xl border border-[#DAD7CF] bg-white px-3 py-2.5";
  return (
    <section className="space-y-5 rounded-[24px] border border-[#DAD7CF] bg-white p-5 text-[#12241C] sm:p-8">
      <h2 className="text-xl font-semibold tracking-[-0.03em]">Reservar</h2>
      {!cancha ? <p>Este complejo todavía no tiene canchas para reservar.</p> : (
        <fieldset disabled={reservando} className="min-w-0 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {canchas.length > 1 && (
              <label className="text-sm font-semibold">
                Cancha
                <select value={cancha.id} className={campo} onChange={(evento) => {
                  elegirCancha(evento.target.value);
                  cambiarErrorReserva("");
                  volverACargar();
                }}>
                  {canchas.map((opcion) => <option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>)}
                </select>
              </label>
            )}
            <label className="text-sm font-semibold">
              Fecha
              <input type="date" min={hoy} value={fecha} className={campo} onChange={(evento) => {
                elegirFecha(evento.target.value);
                cambiarErrorReserva("");
                volverACargar();
              }} />
            </label>
          </div>

          {fecha && fecha < hoy && <p role="alert" className="text-sm text-[#A8302D]">Elige la fecha de hoy o una fecha posterior.</p>}
          {consulta && !actual && <p role="status" className="text-sm">Cargando horarios…</p>}
          {actual?.error && (
            <div role="alert" className="text-sm">
              <p>{actual.error}</p>
              <button type="button" onClick={volverACargar} className="mt-1 font-semibold underline">Volver a intentar</button>
            </div>
          )}
          {actual?.bloques?.length === 0 && <p role="status" className="text-sm">No hay horarios para esta fecha.</p>}
          {actual?.bloques && actual.bloques.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Horario</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {actual.bloques.map((horario) => (
                  <button
                    key={horario.inicio}
                    type="button"
                    disabled={horario.estado === "ocupado"}
                    aria-pressed={horario.inicio === bloque?.inicio}
                    onClick={() => { elegirInicio(horario.inicio); cambiarErrorReserva(""); }}
                    className="rounded-xl bg-[#D9F24A] px-2 py-2.5 text-sm font-semibold enabled:hover:ring-2 enabled:hover:ring-[#0F7A4D] aria-pressed:ring-2 aria-pressed:ring-[#0F7A4D] disabled:bg-[#F0EEE9] disabled:text-[#627067] disabled:aria-pressed:ring-0"
                  >
                    {formatearHora(Date.parse(horario.inicio))}–{formatearHora(Date.parse(horario.fin))}
                    {horario.estado === "ocupado" && <span className="block text-xs font-medium">Ocupado</span>}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

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

          {errorReserva && <p role="alert" className="text-sm">{errorReserva}</p>}
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
