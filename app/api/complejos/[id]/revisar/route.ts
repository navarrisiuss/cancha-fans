// POST /api/complejos/{id}/revisar: el admin aprueba o rechaza un complejo en revisión. Es la única
// vía para cambiar el estado: las security rules no dejan editar complejos desde el cliente y el
// Admin SDK las salta, así que la autorización real es exigirAdmin.
//
// Body: { decision: "aprobado" | "rechazado", nota: string }. La nota es interna (el dueño no la
// ve) y es obligatoria solo al rechazar.
import { FieldValue } from "firebase-admin/firestore";
import { dbAdmin } from "../../../../../lib/firebase/admin";
import { exigirAdmin } from "../../../../../lib/firebase/exigir-admin";

const MAX_NOTA = 1000;

function responder(estado: number, cuerpo: object) {
  return Response.json(cuerpo, { status: estado, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, ctx: RouteContext<"/api/complejos/[id]/revisar">) {
  const admin = await exigirAdmin(request);
  if (admin instanceof Response) return admin;

  // El body viene del navegador: se valida todo, aunque el formulario ya lo haga.
  const body: unknown = await request.json().catch(() => null);
  const decision = typeof body === "object" && body !== null && "decision" in body ? body.decision : null;
  const nota = typeof body === "object" && body !== null && "nota" in body && typeof body.nota === "string"
    ? body.nota.trim()
    : "";

  if (decision !== "aprobado" && decision !== "rechazado") {
    return responder(400, { error: "La decisión debe ser aprobar o rechazar." });
  }
  if (decision === "rechazado" && !nota) {
    return responder(400, { error: "Escribe una nota para rechazar el complejo." });
  }
  if (nota.length > MAX_NOTA) {
    return responder(400, { error: `La nota puede tener hasta ${MAX_NOTA} caracteres.` });
  }

  const { id } = await ctx.params;
  const db = dbAdmin();
  const complejo = db.collection("complejos").doc(id);

  // Transacción: el estado solo cambia si el complejo sigue en revisión. Si dos admins revisan a la
  // vez, el segundo recibe 409 en vez de pisar la decisión del primero. Cuesta 1 lectura y 1 escritura.
  const estado = await db.runTransaction(async (tx) => {
    const actual = await tx.get(complejo);
    if (!actual.exists) return 404;
    if (actual.get("estado") !== "en_revision") return 409;
    tx.update(complejo, {
      estado: decision,
      notaAdmin: nota,
      revisadoPor: admin.uid,
      revisadoAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return 200;
  });

  if (estado === 404) return responder(404, { error: "El complejo no existe." });
  if (estado === 409) return responder(409, { error: "Este complejo ya fue revisado por otro administrador." });
  return responder(200, { estado: decision });
}
