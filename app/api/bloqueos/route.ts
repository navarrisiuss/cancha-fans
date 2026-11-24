// POST y DELETE /api/bloqueos: permite al dueño de un complejo bloquear un rango horario manual
// (mantención, evento privado, lluvia) o eliminar un bloqueo existente. Rechaza la creación si el
// rango horario choca con alguna reserva activa de esa cancha.
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { dbAdmin } from "../../../lib/firebase/admin";
import { exigirDuenoDeComplejo } from "../../../lib/firebase/exigir-dueno";
import { respuestaError } from "../../../lib/firebase/exigir-usuario";
import { ocupaElBloque } from "../../../lib/reservas-estado";
import type { EstadoReservaGuardado } from "../../../lib/tipos/reserva";
import {
  esFechaValida,
  esHoraValida,
  hoyEnSantiago,
  inicioDelDia,
  inicioDelDiaSiguiente,
  instanteEnSantiago,
} from "../../../lib/zona-horaria";

const MAX_MOTIVO = 200;

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function extraerRangoHorario(cuerpo: Record<string, unknown>): { inicio: Date; fin: Date } | { error: string } {
  // Soporta { fecha: "YYYY-MM-DD", horaInicio: "HH:mm", horaFin: "HH:mm" } en hora de Chile o
  // { inicio, fin } como strings ISO.
  if (typeof cuerpo.fecha === "string" && typeof cuerpo.horaInicio === "string" && typeof cuerpo.horaFin === "string") {
    const fecha = cuerpo.fecha.trim();
    const horaInicio = cuerpo.horaInicio.trim();
    const horaFin = cuerpo.horaFin.trim();
    if (!esFechaValida(fecha)) {
      return { error: "La fecha del bloqueo no es válida." };
    }
    if (!esHoraValida(horaInicio) || !esHoraValida(horaFin)) {
      return { error: "Las horas de inicio y fin deben tener formato HH:mm." };
    }
    const inicio = instanteEnSantiago(fecha, horaInicio);
    const fin = horaFin === "00:00" ? inicioDelDiaSiguiente(fecha) : instanteEnSantiago(fecha, horaFin);
    if (fin.getTime() <= inicio.getTime()) {
      return { error: "La hora de término debe ser posterior a la hora de inicio." };
    }
    return { inicio, fin };
  }

  if (typeof cuerpo.inicio === "string" && typeof cuerpo.fin === "string") {
    const inicio = new Date(cuerpo.inicio);
    const fin = new Date(cuerpo.fin);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
      return { error: "El rango de fechas del bloqueo no es válido." };
    }
    if (fin.getTime() <= inicio.getTime()) {
      return { error: "La hora de término debe ser posterior a la hora de inicio." };
    }
    return { inicio, fin };
  }

  return { error: "Indica la fecha y las horas de inicio y término del bloqueo." };
}

export async function POST(request: Request) {
  const cuerpo: unknown = await request.json().catch(() => null);
  if (!esObjeto(cuerpo)) {
    return respuestaError(400, "Los datos del bloqueo no son válidos.");
  }

  const complejoId = typeof cuerpo.complejoId === "string" ? cuerpo.complejoId.trim() : "";
  const canchaId = typeof cuerpo.canchaId === "string" ? cuerpo.canchaId.trim() : "";
  const motivo = typeof cuerpo.motivo === "string" ? cuerpo.motivo.trim() : "";

  if (!complejoId || !canchaId) {
    return respuestaError(400, "Elige el complejo y la cancha a bloquear.");
  }
  if (!motivo) {
    return respuestaError(400, "Escribe un motivo para el bloqueo (ej. mantención, evento privado, lluvia).");
  }
  if (motivo.length > MAX_MOTIVO) {
    return respuestaError(400, `El motivo puede tener hasta ${MAX_MOTIVO} caracteres.`);
  }

  const rango = extraerRangoHorario(cuerpo);
  if ("error" in rango) {
    return respuestaError(400, rango.error);
  }

  const permiso = await exigirDuenoDeComplejo(request, complejoId);
  if (permiso instanceof Response) return permiso;

  const db = dbAdmin();
  const canchaRef = db.collection("complejos").doc(complejoId).collection("canchas").doc(canchaId);
  const nuevoRef = db.collection("bloqueos").doc();

  // Acotamos la consulta al rango del bloqueo usando el índice compuesto canchaId + inicio:
  // desde el inicio del día del bloqueo hasta antes de `rango.fin`, y dentro de una transacción
  // descartamos en memoria las que terminan antes o en `rango.inicio`.
  const desdeDia = inicioDelDia(hoyEnSantiago(rango.inicio));
  const consultaReservas = db
    .collection("reservas")
    .where("canchaId", "==", canchaId)
    .where("inicio", ">=", Timestamp.fromDate(desdeDia))
    .where("inicio", "<", Timestamp.fromDate(rango.fin));

  const resultado = await db.runTransaction(async (tx): Promise<201 | 404 | 409> => {
    const [canchaSnap, reservasSnap] = await Promise.all([
      tx.get(canchaRef),
      tx.get(consultaReservas),
    ]);

    if (!canchaSnap.exists) {
      return 404;
    }

    const ahora = new Date();
    const chocaConReserva = reservasSnap.docs.some((doc) => {
      const inicioReserva = doc.get("inicio") as Timestamp | undefined;
      const finReserva = doc.get("fin") as Timestamp | undefined;
      const estado = doc.get("estado") as EstadoReservaGuardado | undefined;
      const expiraAt = (doc.get("expiraAt") as Timestamp | null | undefined) ?? null;
      if (!inicioReserva || !finReserva || !estado) return false;

      if (finReserva.toMillis() <= rango.inicio.getTime()) return false;
      if (inicioReserva.toMillis() >= rango.fin.getTime()) return false;

      return ocupaElBloque({ estado, expiraAt, fin: finReserva }, ahora);
    });

    if (chocaConReserva) {
      return 409;
    }

    tx.set(nuevoRef, {
      complejoId,
      canchaId,
      ownerId: permiso.uid,
      inicio: Timestamp.fromDate(rango.inicio),
      fin: Timestamp.fromDate(rango.fin),
      motivo,
      createdAt: FieldValue.serverTimestamp(),
    });

    return 201;
  });

  if (resultado === 404) {
    return respuestaError(404, "La cancha no existe en este complejo.");
  }
  if (resultado === 409) {
    return respuestaError(409, "No puedes bloquear ese horario porque choca con una reserva activa.");
  }

  return Response.json(
    {
      id: nuevoRef.id,
      complejoId,
      canchaId,
      ownerId: permiso.uid,
      inicio: rango.inicio.toISOString(),
      fin: rango.fin.toISOString(),
      motivo,
    },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  let bloqueoId = (url.searchParams.get("id") ?? url.searchParams.get("bloqueoId") ?? "").trim();

  if (!bloqueoId) {
    const cuerpo: unknown = await request.json().catch(() => null);
    if (esObjeto(cuerpo)) {
      const idCuerpo = cuerpo.id ?? cuerpo.bloqueoId;
      if (typeof idCuerpo === "string") {
        bloqueoId = idCuerpo.trim();
      }
    }
  }

  if (!bloqueoId) {
    return respuestaError(400, "Indica el identificador del bloqueo a eliminar.");
  }

  const db = dbAdmin();
  const bloqueoRef = db.collection("bloqueos").doc(bloqueoId);
  const bloqueoSnap = await bloqueoRef.get();
  if (!bloqueoSnap.exists) {
    return respuestaError(404, "El bloqueo no existe.");
  }

  const complejoId = String(bloqueoSnap.get("complejoId") ?? "");
  const permiso = await exigirDuenoDeComplejo(request, complejoId);
  if (permiso instanceof Response) return permiso;

  await bloqueoRef.delete();

  return Response.json({ id: bloqueoId }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
