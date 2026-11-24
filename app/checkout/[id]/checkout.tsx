"use client";

// El checkout usa la sesión de Firebase, actualiza la cuenta regresiva y envía a Webpay desde el navegador.
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Encabezado } from "../../../components/encabezado";
import { formatearMonto, montoSena } from "../../../components/reservas/formatos";
import { useReservaDelJugador } from "../../../components/reservas/use-reserva-del-jugador";
import { fetchConSesion } from "../../../lib/firebase/fetch-con-sesion";
import { formatearRut, normalizarRut } from "../../../lib/rut";
import { formatearFechaHora } from "../../../lib/zona-horaria";
import { normalizarTelefono } from "../telefono";

const enlace = "font-semibold text-[#0F7A4D] underline";

export function Checkout({ id }: { id: string }) {
  const lectura = useReservaDelJugador(id);
  const reserva = lectura.estado === "lista" ? lectura.reserva : null;
  const vence = reserva?.expiraAt?.toMillis();
  const [ahora, cambiarAhora] = useState(Date.now);
  const segundos = vence ? Math.max(0, Math.ceil((vence - ahora) / 1000)) : 0;

  useEffect(() => {
    if (reserva?.estado !== "pendiente_pago" || !vence) return;
    const reloj = window.setInterval(() => {
      const instante = Date.now();
      cambiarAhora(instante);
      if (instante >= vence) window.clearInterval(reloj);
    }, 1000);
    return () => window.clearInterval(reloj);
  }, [reserva?.estado, vence]);

  const monto = reserva ? (reserva.tipoPago === "total" ? reserva.precioTotal : montoSena(reserva.precioTotal)) : 0;
  const vencida = reserva?.estado === "expirada" || (reserva?.estado === "pendiente_pago" && segundos === 0);
  const cuenta = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;

  return (
    <>
      <Encabezado />
      <main className="mx-auto max-w-2xl px-5 py-10 text-[#12241C]">
        <section className="space-y-5 rounded-[24px] border border-[#DAD7CF] bg-white p-6 sm:p-8">
          <h1 className="text-2xl font-semibold">Pagar reserva</h1>
          {lectura.estado === "cargando" && <p role="status">Cargando tu reserva…</p>}
          {lectura.estado === "sin_sesion" && (
            <Link className={enlace} href={`/iniciar-sesion?siguiente=${encodeURIComponent(`/checkout/${id}`)}`}>
              Iniciar sesión para pagar
            </Link>
          )}
          {lectura.estado === "no_disponible" && <p>No encontramos tu reserva.</p>}
          {lectura.estado === "error" && <p role="alert">No pudimos cargar tu reserva. Recarga la página para volver a intentar.</p>}
          {reserva && (
            <>
              <div>
                <h2 className="text-lg font-semibold">{reserva.complejoNombre} · {reserva.canchaNombre}</h2>
                <p>{formatearFechaHora(reserva.inicio.toDate())}</p>
              </div>
              <dl className="grid grid-cols-[1fr_auto] gap-2 border-y border-[#E7E5DF] py-4 text-sm">
                <dt>Total</dt><dd>{formatearMonto(reserva.precioTotal)}</dd>
                <dt className="font-semibold">{reserva.tipoPago === "sena" ? "Seña a pagar ahora" : "A pagar ahora"}</dt>
                <dd className="font-semibold">{formatearMonto(monto)}</dd>
                <dt>Saldo a pagar en el complejo</dt><dd>{formatearMonto(reserva.precioTotal - monto)}</dd>
              </dl>
              {vencida ? (
                <div className="space-y-2">
                  <p role="alert" className="text-[#A8302D]">El tiempo para pagar terminó. Elige un nuevo horario.</p>
                  <Link className={enlace} href={`/complejos/${encodeURIComponent(reserva.complejoId)}`}>Volver a la ficha del complejo</Link>
                </div>
              ) : reserva.estado === "pendiente_pago" && vence ? (
                <div className="space-y-3">
                  <p>Tiempo para pagar <span role="timer" className="font-semibold tabular-nums">{cuenta}</span></p>
                  <FormularioPago
                    key={id}
                    reservaId={id}
                    jugadorId={reserva.jugadorId}
                    nombreInicial={reserva.jugadorNombre}
                    vence={vence}
                  />
                </div>
              ) : (
                <Link className={enlace} href={`/reservas/${encodeURIComponent(id)}/comprobante`}>Ver comprobante</Link>
              )}
            </>
          )}
        </section>
      </main>
    </>
  );
}

type ErroresFormulario = Partial<Record<"nombre" | "rut" | "telefono" | "aceptaReglas", string>>;

const clasesCampo = "w-full rounded-xl border border-[#DAD7CF] bg-white px-3 py-2 aria-invalid:border-[#A8302D]";
const clasesError = "text-sm text-[#A8302D]";

// El formulario se monta en el navegador una vez cargada la reserva. Usa localStorage para
// recuperar los datos de la cuenta y maneja el envío a Webpay.
function FormularioPago({ reservaId, jugadorId, nombreInicial, vence }: {
  reservaId: string;
  jugadorId: string;
  nombreInicial: string;
  vence: number;
}) {
  const clave = `cancha-fans:checkout:${jugadorId}`;
  const [datosRecordados] = useState(() => {
    try {
      return {
        rut: formatearRut(window.localStorage.getItem(`${clave}:rut`) ?? ""),
        telefono: window.localStorage.getItem(`${clave}:telefono`) ?? "",
      };
    } catch {
      return { rut: "", telefono: "" };
    }
  });
  const [errores, cambiarErrores] = useState<ErroresFormulario>({});
  const [enviando, cambiarEnviando] = useState(false);
  const [error, cambiarError] = useState("");

  async function pagar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (Date.now() >= vence || enviando) return;

    const formulario = new FormData(evento.currentTarget);
    const nombre = String(formulario.get("nombre") ?? "").trim();
    const rut = normalizarRut(String(formulario.get("rut") ?? ""));
    const telefono = normalizarTelefono(String(formulario.get("telefono") ?? ""));
    const aceptaReglas = formulario.has("aceptaReglas");

    const erroresActuales: ErroresFormulario = {};
    if (nombre.length < 2 || nombre.length > 80) {
      erroresActuales.nombre = "Ingresa un nombre y apellido de 2 a 80 caracteres.";
    }
    if (!rut) erroresActuales.rut = "Ingresa un RUT válido.";
    if (!telefono) erroresActuales.telefono = "Ingresa un número de celular chileno válido.";
    if (!aceptaReglas) {
      erroresActuales.aceptaReglas = "Debes aceptar las reglas del recinto y la política de cancelación.";
    }
    cambiarErrores(erroresActuales);
    cambiarError("");
    if (erroresActuales.nombre || !rut || !telefono || !aceptaReglas) return;

    cambiarEnviando(true);
    try {
      window.localStorage.setItem(`${clave}:rut`, rut);
      window.localStorage.setItem(`${clave}:telefono`, telefono);
    } catch {
      // El pago puede continuar si el navegador bloquea el almacenamiento.
    }

    try {
      const respuesta = await fetchConSesion("/api/pagos/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservaId, nombre, rut, telefono, aceptaReglas }),
      });
      const datos = await respuesta.json();
      if (respuesta.ok) {
        const formularioWebpay = document.createElement("form");
        formularioWebpay.method = "POST";
        formularioWebpay.action = datos.url;
        formularioWebpay.hidden = true;
        const token = document.createElement("input");
        token.type = "hidden";
        token.name = "token_ws";
        token.value = datos.token;
        formularioWebpay.append(token);
        document.body.append(formularioWebpay);
        formularioWebpay.submit();
        return;
      }
      cambiarError(datos.error ?? "No pudimos iniciar el pago.");
    } catch {
      cambiarError("No pudimos iniciar el pago. Intenta nuevamente.");
    }
    cambiarEnviando(false);
  }

  return (
    <form className="space-y-3" noValidate onSubmit={pagar}>
      <fieldset className="space-y-3" disabled={enviando}>
        <div className="space-y-1">
          <label htmlFor="checkout-nombre" className="text-sm font-semibold">Nombre y apellido</label>
          <input
            id="checkout-nombre"
            name="nombre"
            autoComplete="name"
            defaultValue={nombreInicial}
            required
            aria-invalid={Boolean(errores.nombre)}
            aria-describedby={errores.nombre ? "checkout-error-nombre" : undefined}
            className={clasesCampo}
          />
          {errores.nombre && <p id="checkout-error-nombre" role="alert" className={clasesError}>{errores.nombre}</p>}
        </div>
        <div className="space-y-1">
          <label htmlFor="checkout-rut" className="text-sm font-semibold">RUT</label>
          <input
            id="checkout-rut"
            name="rut"
            defaultValue={datosRecordados.rut}
            placeholder="12.345.678-5"
            onChange={(evento) => {
              const campo = evento.currentTarget;
              campo.value = formatearRut(campo.value);
            }}
            required
            aria-invalid={Boolean(errores.rut)}
            aria-describedby={errores.rut ? "checkout-error-rut" : undefined}
            className={clasesCampo}
          />
          {errores.rut && <p id="checkout-error-rut" role="alert" className={clasesError}>{errores.rut}</p>}
        </div>
        <div className="space-y-1">
          <label htmlFor="checkout-telefono" className="text-sm font-semibold">Teléfono</label>
          <input
            id="checkout-telefono"
            name="telefono"
            type="tel"
            autoComplete="tel"
            defaultValue={datosRecordados.telefono}
            placeholder="+56 9 1234 5678"
            required
            aria-invalid={Boolean(errores.telefono)}
            aria-describedby={errores.telefono ? "checkout-error-telefono" : undefined}
            className={clasesCampo}
          />
          {errores.telefono && <p id="checkout-error-telefono" role="alert" className={clasesError}>{errores.telefono}</p>}
        </div>
        <div className="space-y-1">
          <div className="flex items-start gap-2">
            <input
              id="checkout-acepta-reglas"
              name="aceptaReglas"
              type="checkbox"
              required
              aria-invalid={Boolean(errores.aceptaReglas)}
              aria-describedby={errores.aceptaReglas ? "checkout-error-acepta-reglas" : undefined}
              className="mt-0.5 size-4 shrink-0 accent-[#0F7A4D]"
            />
            <label htmlFor="checkout-acepta-reglas" className="text-sm">
              Acepto las{" "}
              <Link href="/terminos" target="_blank" rel="noopener" className={enlace}>reglas del recinto</Link>
              {" "}y la{" "}
              <Link href="/reglas-de-cancelacion" target="_blank" rel="noopener" className={enlace}>
                política de cancelación
              </Link>
            </label>
          </div>
          {errores.aceptaReglas && (
            <p id="checkout-error-acepta-reglas" role="alert" className={clasesError}>{errores.aceptaReglas}</p>
          )}
        </div>
      </fieldset>
      {error && <p role="alert" className="text-sm">{error}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-xl bg-[#0F7A4D] px-4 py-3 font-semibold text-white enabled:hover:bg-[#0B6840] disabled:opacity-50"
      >
        {enviando ? "Abriendo Webpay…" : "Pagar con Webpay"}
      </button>
    </form>
  );
}
