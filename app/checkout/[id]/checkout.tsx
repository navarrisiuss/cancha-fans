"use client";

// El checkout usa la sesión de Firebase, actualiza la cuenta regresiva y envía a Webpay desde el navegador.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Encabezado } from "../../../components/encabezado";
import { formatearMonto, montoSena } from "../../../components/reservas/formatos";
import { useReservaDelJugador } from "../../../components/reservas/use-reserva-del-jugador";
import { fetchConSesion } from "../../../lib/firebase/fetch-con-sesion";
import { formatearFechaHora } from "../../../lib/zona-horaria";

const enlace = "font-semibold text-[#0F7A4D] underline";

export function Checkout({ id }: { id: string }) {
  const lectura = useReservaDelJugador(id);
  const reserva = lectura.estado === "lista" ? lectura.reserva : null;
  const vence = reserva?.expiraAt?.toMillis();
  const [ahora, cambiarAhora] = useState(Date.now);
  const [enviando, cambiarEnviando] = useState(false);
  const [error, cambiarError] = useState("");
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

  async function pagar() {
    if (!vence || Date.now() >= vence || enviando) return;
    cambiarEnviando(true);
    cambiarError("");

    try {
      const respuesta = await fetchConSesion("/api/pagos/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservaId: id }),
      });
      const datos = await respuesta.json();
      if (respuesta.ok) {
        const formulario = document.createElement("form");
        formulario.method = "POST";
        formulario.action = datos.url;
        formulario.hidden = true;
        const token = document.createElement("input");
        token.type = "hidden";
        token.name = "token_ws";
        token.value = datos.token;
        formulario.append(token);
        document.body.append(formulario);
        formulario.submit();
        return;
      }
      cambiarError(datos.error ?? "No pudimos iniciar el pago.");
    } catch {
      cambiarError("No pudimos iniciar el pago. Intenta nuevamente.");
    }
    cambiarEnviando(false);
  }

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
              ) : reserva.estado === "pendiente_pago" ? (
                <div className="space-y-3">
                  <p>Tiempo para pagar <span role="timer" className="font-semibold tabular-nums">{cuenta}</span></p>
                  {error && <p role="alert" className="text-sm">{error}</p>}
                  <button
                    type="button"
                    disabled={enviando}
                    onClick={() => void pagar()}
                    className="w-full rounded-xl bg-[#0F7A4D] px-4 py-3 font-semibold text-white enabled:hover:bg-[#0B6840] disabled:opacity-50"
                  >
                    {enviando ? "Abriendo Webpay…" : "Pagar con Webpay"}
                  </button>
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
