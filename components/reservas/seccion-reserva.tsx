// Sección de la ficha de un complejo donde el jugador elige cancha, fecha y bloque para reservar.
// Es el punto de integración entre la ficha pública (rama feat/busqueda-y-ficha), que solo la
// monta, y la reserva (rama feat/reserva-y-pago), que la implementa. La firma es un contrato: no
// cambia sin avisar.
//
// ESTADO ACTUAL: stub sin interacción. La rama feat/reserva-y-pago lo reemplaza por la grilla de
// bloques, que será un componente cliente porque la selección es interactiva y la disponibilidad
// se pide fresca al elegir fecha (nunca se cachea).
import type { CanchaConId } from "../../lib/tipos/cancha";

export function SeccionReserva({ complejoId, canchas }: { complejoId: string; canchas: CanchaConId[] }) {
  return (
    <section data-complejo={complejoId} className="rounded-[24px] border border-[#DAD7CF] bg-white p-8">
      <h2 className="text-xl font-semibold tracking-[-0.03em]">Reservar</h2>
      <p className="mt-2 text-sm text-[#627067]">
        {canchas.length === 0
          ? "Este complejo todavía no tiene canchas para reservar."
          : "La reserva de horarios estará disponible muy pronto."}
      </p>
    </section>
  );
}
