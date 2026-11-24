// Estado de una reserva tal como lo ve el usuario. No hay tareas programadas, así que los cambios
// que dependen del paso del tiempo se calculan al leer, no se guardan:
//   - pendiente_pago con expiraAt vencido → "expirada" (la reserva dejó de tener el bloque tomado).
//   - pagada con `fin` ya pasado → "jugada".
//
// Módulo puro: lo usan el servidor (disponibilidad, cancelación) y el cliente (Mis reservas).
import type { EstadoReserva, Reserva } from "./tipos/reserva";

type CamposDeEstado = Pick<Reserva, "estado" | "expiraAt" | "fin">;

export function estadoVisibleReserva(reserva: CamposDeEstado, ahora: Date = new Date()): EstadoReserva {
  if (reserva.estado === "pendiente_pago") {
    const vencida = reserva.expiraAt !== null && reserva.expiraAt.toMillis() <= ahora.getTime();
    return vencida ? "expirada" : "pendiente_pago";
  }
  if (reserva.estado === "pagada" && reserva.fin.toMillis() <= ahora.getTime()) {
    return "jugada";
  }
  return reserva.estado;
}

// ¿La reserva mantiene el bloque ocupado? Lo usan la disponibilidad y la transacción que crea una
// reserva: una pendiente_pago vencida, una cancelada o una expirada dejan el bloque libre.
export function ocupaElBloque(reserva: CamposDeEstado, ahora: Date = new Date()): boolean {
  const estado = estadoVisibleReserva(reserva, ahora);
  return estado === "pendiente_pago" || estado === "pagada" || estado === "jugada";
}
