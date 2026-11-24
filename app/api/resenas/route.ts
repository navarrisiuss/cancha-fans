import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { dbAdmin } from "@/lib/firebase/admin";
import { exigirUsuario, respuestaError } from "@/lib/firebase/exigir-usuario";
import { estadoVisibleReserva } from "@/lib/reservas-estado";
import type { Resena } from "@/lib/tipos/resena";
import type { Reserva } from "@/lib/tipos/reserva";

function leerTexto(valor: unknown, maximo: number): string | null {
  if (valor === undefined) return "";
  if (typeof valor !== "string") return null;
  const texto = valor.trim();
  return texto.length <= maximo ? texto : null;
}

export async function POST(request: Request) {
  const usuario = await exigirUsuario(request);
  if (usuario instanceof Response) return usuario;

  const cuerpo: unknown = await request.json().catch(() => null);
  if (typeof cuerpo !== "object" || cuerpo === null || Array.isArray(cuerpo)) {
    return respuestaError(400, "Envía los datos de la reseña.");
  }
  const datos = cuerpo as Record<string, unknown>;
  const { reservaId, rating } = datos;
  if (
    typeof reservaId !== "string" || !reservaId.trim() || reservaId.includes("/") ||
    reservaId === "." || reservaId === ".." || /^__.*__$/.test(reservaId)
  ) {
    return respuestaError(400, "Indica una reserva válida.");
  }
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return respuestaError(400, "Selecciona entre 1 y 5 estrellas.");
  }

  const comentario = leerTexto(datos.comentario, 1000);
  const equipoNombre = leerTexto(datos.equipoNombre, 80);
  const equipoRivalNombre = leerTexto(datos.equipoRivalNombre, 80);
  const resultado = leerTexto(datos.resultado, 40);
  if (comentario === null) return respuestaError(400, "El comentario debe ser un texto de hasta 1000 caracteres.");
  if (equipoNombre === null || equipoRivalNombre === null) {
    return respuestaError(400, "Cada nombre de equipo debe ser un texto de hasta 80 caracteres.");
  }
  if (resultado === null) return respuestaError(400, "El resultado debe ser un texto de hasta 40 caracteres.");

  const db = dbAdmin();
  const referenciaReserva = db.collection("reservas").doc(reservaId);
  const referenciaResena = db.collection("resenas").doc(reservaId);
  // Hasta tres lecturas por intento: reserva, reseña y complejo. El nombre ya está en la reserva.
  const error = await db.runTransaction(async (tx) => {
    const reserva = (await tx.get(referenciaReserva)).data() as Reserva | undefined;
    if (!reserva) return respuestaError(404, "La reserva no existe.");
    if (reserva.jugadorId !== usuario.uid) {
      return respuestaError(403, "Solo puedes reseñar tus propias reservas.");
    }
    if (estadoVisibleReserva(reserva) !== "jugada") {
      return respuestaError(409, "Puedes dejar una reseña cuando termine tu partido.");
    }
    if ((await tx.get(referenciaResena)).exists) {
      return respuestaError(409, "Ya enviaste una reseña para esta reserva.");
    }

    const referenciaComplejo = db.collection("complejos").doc(reserva.complejoId);
    const complejo = await tx.get(referenciaComplejo);
    if (!complejo.exists) return respuestaError(404, "El complejo de la reserva no existe.");

    const promedio: number = complejo.get("ratingPromedio") ?? 0;
    const total: number = complejo.get("totalResenas") ?? 0;
    const nuevoPromedio = (promedio * total + rating) / (total + 1);
    const resena: Resena = {
      complejoId: reserva.complejoId,
      canchaId: reserva.canchaId,
      jugadorId: usuario.uid,
      jugadorNombre: reserva.jugadorNombre,
      rating,
      comentario,
      equipoNombre,
      equipoRivalNombre,
      resultado,
      reportada: false,
      createdAt: Timestamp.now(),
    };

    tx.create(referenciaResena, resena);
    tx.update(referenciaComplejo, {
      totalResenas: total + 1,
      ratingPromedio: Math.round(nuevoPromedio * 100) / 100,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(referenciaReserva, { tieneResena: true, updatedAt: FieldValue.serverTimestamp() });
    return null;
  });

  return error ?? Response.json({ tieneResena: true }, {
    status: 201,
    headers: { "Cache-Control": "no-store" },
  });
}
