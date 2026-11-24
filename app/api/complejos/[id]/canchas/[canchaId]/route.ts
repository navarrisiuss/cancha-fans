// PATCH /api/complejos/{id}/canchas/{canchaId}: edita una cancha existente (incluyendo activarla o
// desactivarla) y recalcula formatosDisponibles del complejo en el mismo batch.
import { FieldValue } from "firebase-admin/firestore";
import { dbAdmin } from "../../../../../../lib/firebase/admin";
import { exigirDuenoDeComplejo } from "../../../../../../lib/firebase/exigir-dueno";
import { respuestaError } from "../../../../../../lib/firebase/exigir-usuario";
import type { Cancha } from "../../../../../../lib/tipos/cancha";
import { calcularFormatosDisponibles, mezclarDatosCancha } from "../validacion";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/complejos/[id]/canchas/[canchaId]">,
) {
  const { id, canchaId } = await ctx.params;
  const permiso = await exigirDuenoDeComplejo(request, id);
  if (permiso instanceof Response) return permiso;

  const estadoComplejo = permiso.complejo.get("estado");
  if (estadoComplejo !== "en_revision" && estadoComplejo !== "aprobado") {
    return respuestaError(409, "Solo puedes editar canchas de complejos en revisión o aprobados.");
  }

  const cuerpo: unknown = await request.json().catch(() => null);

  const db = dbAdmin();
  const complejoRef = db.collection("complejos").doc(id);
  const canchasRef = complejoRef.collection("canchas");

  // Una sola lectura de la subcolección trae la cancha objetivo y sus hermanas para recalcular
  // formatosDisponibles sin hacer dos viajes a Firestore.
  const canchasSnap = await canchasRef.get();
  const docActual = canchasSnap.docs.find((d) => d.id === canchaId);
  if (!docActual) {
    return respuestaError(404, "La cancha no existe.");
  }

  const datosActuales: Cancha = {
    nombre: docActual.get("nombre"),
    formato: docActual.get("formato"),
    superficie: docActual.get("superficie"),
    techada: docActual.get("techada") === true,
    precioPorBloque: docActual.get("precioPorBloque"),
    duracionBloqueMin: docActual.get("duracionBloqueMin"),
    horarioAtencion: docActual.get("horarioAtencion"),
    activa: docActual.get("activa") === true,
  };

  const validacion = mezclarDatosCancha(datosActuales, cuerpo);
  if ("error" in validacion) {
    return respuestaError(400, validacion.error);
  }

  const listaCanchas: Array<Pick<Cancha, "formato" | "activa">> = canchasSnap.docs.map((d) =>
    d.id === canchaId
      ? { formato: validacion.cancha.formato, activa: validacion.cancha.activa }
      : { formato: d.get("formato"), activa: d.get("activa") === true },
  );
  const formatosDisponibles = calcularFormatosDisponibles(listaCanchas);

  const batch = db.batch();
  batch.update(canchasRef.doc(canchaId), {
    ...validacion.cancha,
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.update(complejoRef, {
    formatosDisponibles,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return Response.json(
    { id: canchaId, cancha: { id: canchaId, ...validacion.cancha }, formatosDisponibles },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
