import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { dbAdmin } from "@/lib/firebase/admin";
import { exigirUsuario, respuestaError } from "@/lib/firebase/exigir-usuario";
import { notificar } from "@/lib/notificaciones/notificar";
import { PORCENTAJE_PENALIZACION_CANCELACION } from "@/lib/reglas";
import type { QuienCancela, Reserva } from "@/lib/tipos/reserva";
import { formatearFechaHora } from "@/lib/zona-horaria";

const MAX_MOTIVO = 500;
const pesos = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });

export async function POST(request: Request, contexto: RouteContext<"/api/reservas/[id]/cancelar">) {
  const usuario = await exigirUsuario(request);
  if (usuario instanceof Response) return usuario;

  const texto = await request.text();
  let cuerpo: unknown;
  try {
    cuerpo = texto.trim() ? JSON.parse(texto) : {};
  } catch {
    return respuestaError(400, "Envía un motivo válido o deja el campo vacío.");
  }
  if (typeof cuerpo !== "object" || cuerpo === null || Array.isArray(cuerpo)) {
    return respuestaError(400, "Envía un objeto con el motivo de cancelación.");
  }
  const motivoRecibido = "motivo" in cuerpo ? cuerpo.motivo : "";
  if (typeof motivoRecibido !== "string") {
    return respuestaError(400, "El motivo debe ser un texto.");
  }
  const motivo = motivoRecibido.trim();
  if (motivo.length > MAX_MOTIVO) {
    return respuestaError(400, `El motivo puede tener hasta ${MAX_MOTIVO} caracteres.`);
  }

  const { id } = await contexto.params;
  if (id.includes("/") || id === "." || id === ".." || /^__.*__$/.test(id)) {
    return respuestaError(400, "El identificador de la reserva no es válido.");
  }
  const db = dbAdmin();
  const referencia = db.collection("reservas").doc(id);

  // Una lectura por intento. Si dos personas cancelan a la vez, solo una cambia el estado.
  const resultado = await db.runTransaction(async (tx) => {
    const reserva = (await tx.get(referencia)).data() as Reserva | undefined;
    if (!reserva) return respuestaError(404, "La reserva no existe.");

    let canceladaPor: QuienCancela;
    if (usuario.uid === reserva.jugadorId) {
      canceladaPor = "jugador";
    } else if (usuario.uid === reserva.ownerId) {
      canceladaPor = "arrendatario";
    } else {
      return respuestaError(403, "No tienes permiso para cancelar esta reserva.");
    }

    const ahora = Date.now();
    if (reserva.estado !== "pagada" || reserva.inicio.toMillis() <= ahora) {
      return respuestaError(409, "Solo puedes cancelar reservas pagadas que aún no empiezan.");
    }
    if (canceladaPor === "arrendatario" && !motivo) {
      return respuestaError(400, "Escribe el motivo de la cancelación para avisarle al jugador.");
    }

    const penalizacion =
      canceladaPor === "jugador" && ahora > reserva.cancelableHasta.toMillis()
        ? Math.round((reserva.montoPagado * PORCENTAJE_PENALIZACION_CANCELACION) / 100)
        : null;

    tx.update(referencia, {
      estado: "cancelada",
      canceladaPor,
      motivoCancelacion: motivo || null,
      penalizacion,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { reserva, canceladaPor, penalizacion };
  });

  if (resultado instanceof Response) return resultado;

  const { reserva, canceladaPor, penalizacion } = resultado;
  const canceloJugador = canceladaPor === "jugador";
  const quien = canceloJugador ? "El jugador" : "El arrendatario";
  // El aviso se envía después de confirmar la transacción para evitar duplicarlo en un reintento.
  try {
    const fechaHora = formatearFechaHora(reserva.inicio.toMillis());
    let mensaje = `${quien} canceló la reserva ${reserva.codigo} en ${reserva.complejoNombre} · ${reserva.canchaNombre} del ${fechaHora}.`;
    if (canceloJugador && penalizacion !== null) {
      mensaje += ` El jugador pierde ${pesos.format(penalizacion)} por cancelar fuera de la ventana.`;
    }
    if (!canceloJugador) {
      mensaje += " Conservas todo tu dinero.";
    }
    if (motivo) {
      mensaje += ` Motivo: ${motivo}`;
    }

    await notificar({
      userId: canceloJugador ? reserva.ownerId : reserva.jugadorId,
      tipo: canceloJugador ? "reserva_cancelada_jugador" : "reserva_cancelada_arrendatario",
      titulo: "Reserva cancelada",
      mensaje,
      enlace: canceloJugador ? "/arrendatario/reservas" : "/mis-reservas",
    });
  } catch (error) {
    console.error("No se pudo enviar el aviso de cancelación.", error);
  }

  return Response.json(
    { estado: "cancelada", canceladaPor, penalizacion },
    { headers: { "Cache-Control": "no-store" } },
  );
}
