"use client";

// El comprobante lee un documento privado con el SDK cliente y la sesión de Firebase Auth.
import Link from "next/link";
import { formatearMonto } from "../../../../components/reservas/formatos";
import { useReservaDelJugador } from "../../../../components/reservas/use-reserva-del-jugador";
import { estadoVisibleReserva } from "../../../../lib/reservas-estado";
import type { EstadoReserva } from "../../../../lib/tipos/reserva";
import { formatearFechaHora } from "../../../../lib/zona-horaria";

const estados: Record<EstadoReserva, string> = {
  pendiente_pago: "Pendiente de pago",
  pagada: "Pagado",
  jugada: "Jugada",
  cancelada: "Cancelada",
  expirada: "Expirada",
};
const enlace = "font-semibold text-[#0F7A4D] underline";

export function Comprobante({ id, reintentarRetorno }: { id: string; reintentarRetorno: boolean }) {
  const lectura = useReservaDelJugador(id);
  const reserva = lectura.estado === "lista" ? lectura.reserva : null;
  const estado = reserva && estadoVisibleReserva(reserva);

  return (
    <section className="space-y-5 rounded-[24px] border border-[#DAD7CF] bg-white p-6 sm:p-8">
      <h1 className="text-2xl font-semibold">Comprobante de reserva</h1>
      {lectura.estado === "cargando" && <p role="status">Cargando tu comprobante…</p>}
      {lectura.estado === "sin_sesion" && (
        <Link className={enlace} href={`/iniciar-sesion?siguiente=${encodeURIComponent(
          `/reservas/${id}/comprobante${reintentarRetorno ? "?retorno=pendiente" : ""}`,
        )}`}>Iniciar sesión para ver el comprobante</Link>
      )}
      {lectura.estado === "no_disponible" && <p>No encontramos tu reserva.</p>}
      {lectura.estado === "error" && <p role="alert">No pudimos cargar el comprobante. Recarga la página para volver a intentar.</p>}
      {reserva && estado && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">Reserva {reserva.codigo}</p>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${estado === "pagada" ? "bg-[#D9F24A]" : "bg-[#F0EEE9]"}`}>
              {estados[estado]}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">{reserva.complejoNombre} · {reserva.canchaNombre}</h2>
            <p>{formatearFechaHora(reserva.inicio.toDate())}</p>
          </div>
          <dl className="grid grid-cols-[1fr_auto] gap-2 border-y border-[#E7E5DF] py-4 text-sm">
            <dt>Monto pagado</dt><dd>{formatearMonto(reserva.montoPagado)}</dd>
            <dt>Saldo a pagar en el complejo</dt>
            <dd>{formatearMonto(estado === "pagada" || estado === "jugada" ? reserva.saldoPendiente : 0)}</dd>
          </dl>
          {estado === "expirada" && (
            <div className="space-y-2">
              <p role="alert" className="text-[#A8302D]">El pago no se completó y el horario quedó libre. Vuelve a reservar.</p>
              <Link className={enlace} href={`/complejos/${encodeURIComponent(reserva.complejoId)}`}>Volver a la ficha del complejo</Link>
            </div>
          )}
          {estado === "pendiente_pago" && reintentarRetorno && reserva.webpayToken && (
            <form action="/api/pagos/retorno" method="POST" className="space-y-2">
              <p role="alert">No pudimos verificar el resultado del pago.</p>
              <input type="hidden" name="token_ws" value={reserva.webpayToken} />
              <button type="submit" className={enlace}>Volver a verificar el pago</button>
            </form>
          )}
          {estado === "pendiente_pago" && reserva.expiraAt && !reintentarRetorno && (
            <p><Link className={enlace} href={`/checkout/${encodeURIComponent(id)}`}>Ir a pagar</Link></p>
          )}
          <Link href="/mis-reservas" className={enlace}>Mis reservas</Link>
        </>
      )}
    </section>
  );
}
