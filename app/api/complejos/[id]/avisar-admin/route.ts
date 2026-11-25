// POST /api/complejos/{id}/avisar-admin: el dueño avisa a los administradores que su postulación
// espera revisión. La postulación se escribe desde el navegador y las notificaciones solo se crean
// en el servidor (con el Admin SDK), por eso hace falta este Route Handler. Sin body.
//
// Responde { avisado: true } la primera vez y { avisado: false } si ya se había avisado.
import { FieldValue } from "firebase-admin/firestore";
import { dbAdmin } from "../../../../../lib/firebase/admin";
import { exigirDuenoDeComplejo } from "../../../../../lib/firebase/exigir-dueno";
import { notificar } from "../../../../../lib/notificaciones/notificar";

function responder(estado: number, cuerpo: object) {
  return Response.json(cuerpo, { status: estado, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, ctx: RouteContext<"/api/complejos/[id]/avisar-admin">) {
  const { id } = await ctx.params;
  const dueno = await exigirDuenoDeComplejo(request, id);
  if (dueno instanceof Response) return dueno;

  const db = dbAdmin();
  // Los administradores se consultan antes de marcar el aviso: si esta consulta falla, el complejo
  // no queda marcado como avisado. Cuesta 1 lectura por administrador.
  const admins = await db.collection("users").where("isAdmin", "==", true).get();

  // Transacción: dos llamadas simultáneas no pueden avisar dos veces. Cuesta 1 lectura y, la
  // primera vez, 1 escritura.
  const complejo = dueno.complejo.ref;
  const resultado = await db.runTransaction(async (tx) => {
    const actual = await tx.get(complejo);
    if (actual.get("estado") !== "en_revision") return "revisado";
    if (actual.get("avisoAdminAt")) return "repetido";
    tx.update(complejo, { avisoAdminAt: FieldValue.serverTimestamp() });
    return "avisar";
  });

  if (resultado === "revisado") {
    return responder(409, { error: "Este complejo no está esperando revisión." });
  }
  if (resultado === "repetido") return responder(200, { avisado: false });

  // notificar() no lanza errores: un fallo con un administrador no impide avisar al resto.
  await Promise.all(
    admins.docs.map((admin) =>
      notificar({
        userId: admin.id,
        tipo: "complejo_por_revisar",
        titulo: "Nuevo complejo por revisar",
        mensaje: `El complejo "${dueno.complejo.get("nombre")}" de ${dueno.complejo.get("comuna")} espera tu revisión.`,
        enlace: `/admin/complejos/${id}`,
      }),
    ),
  );

  return responder(200, { avisado: true });
}
