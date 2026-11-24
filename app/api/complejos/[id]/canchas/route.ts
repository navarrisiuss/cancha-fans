// POST /api/complejos/{id}/canchas: crea una cancha en el complejo y actualiza formatosDisponibles
// del complejo en el mismo batch. Las security rules prohíben escribir canchas desde el cliente,
// así que toda alta pasa por este Route Handler validando que el usuario sea dueño del complejo.
import { FieldValue } from "firebase-admin/firestore";
import { dbAdmin } from "../../../../../lib/firebase/admin";
import { exigirDuenoDeComplejo } from "../../../../../lib/firebase/exigir-dueno";
import { respuestaError } from "../../../../../lib/firebase/exigir-usuario";
import type { Cancha } from "../../../../../lib/tipos/cancha";
import { calcularFormatosDisponibles, validarDatosCancha } from "./validacion";

export async function POST(request: Request, ctx: RouteContext<"/api/complejos/[id]/canchas">) {
  const { id } = await ctx.params;
  const permiso = await exigirDuenoDeComplejo(request, id);
  if (permiso instanceof Response) return permiso;

  const estadoComplejo = permiso.complejo.get("estado");
  if (estadoComplejo !== "en_revision" && estadoComplejo !== "aprobado") {
    return respuestaError(409, "Solo puedes crear canchas en complejos en revisión o aprobados.");
  }

  const cuerpo: unknown = await request.json().catch(() => null);
  const validacion = validarDatosCancha(cuerpo);
  if ("error" in validacion) {
    return respuestaError(400, validacion.error);
  }

  const db = dbAdmin();
  const complejoRef = db.collection("complejos").doc(id);
  const canchasRef = complejoRef.collection("canchas");

  // Leemos las canchas actuales para recalcular formatosDisponibles junto con la cancha nueva.
  const existentesSnap = await canchasRef.get();
  const listaCanchas: Array<Pick<Cancha, "formato" | "activa">> = existentesSnap.docs.map((doc) => ({
    formato: doc.get("formato"),
    activa: doc.get("activa") === true,
  }));
  listaCanchas.push({ formato: validacion.cancha.formato, activa: validacion.cancha.activa });

  const formatosDisponibles = calcularFormatosDisponibles(listaCanchas);
  const nuevaCanchaRef = canchasRef.doc();

  const batch = db.batch();
  batch.set(nuevaCanchaRef, {
    ...validacion.cancha,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.update(complejoRef, {
    formatosDisponibles,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return Response.json(
    { id: nuevaCanchaRef.id, cancha: { id: nuevaCanchaRef.id, ...validacion.cancha }, formatosDisponibles },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
