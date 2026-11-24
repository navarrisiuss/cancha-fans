// Guard de los endpoints que modifican algo de un complejo (canchas, bloqueos). La pregunta de
// autorización nunca es "¿este usuario es arrendatario?" sino "¿este usuario es dueño de este
// complejo?" (ver "Roles" en CLAUDE.md). Corre solo en el servidor.
import "server-only";

import type { DocumentSnapshot } from "firebase-admin/firestore";
import { dbAdmin } from "./admin";
import { exigirUsuario, respuestaError } from "./exigir-usuario";

// Uso en un Route Handler:
//   const resultado = await exigirDuenoDeComplejo(request, complejoId);
//   if (resultado instanceof Response) return resultado;
//   // resultado.uid es el dueño; resultado.complejo es el documento ya leído (no lo vuelvas a leer)
//
// Responde 401 sin sesión, 404 si el complejo no existe y 403 si existe pero es de otra persona.
// Cuesta 1 lectura de Firestore (el documento del complejo).
export async function exigirDuenoDeComplejo(
  request: Request,
  complejoId: string,
): Promise<{ uid: string; complejo: DocumentSnapshot } | Response> {
  const usuario = await exigirUsuario(request);
  if (usuario instanceof Response) {
    return usuario;
  }

  const complejo = await dbAdmin().collection("complejos").doc(complejoId).get();
  if (!complejo.exists) {
    return respuestaError(404, "El complejo no existe.");
  }
  if (complejo.get("ownerId") !== usuario.uid) {
    return respuestaError(403, "Este complejo no es tuyo.");
  }

  return { uid: usuario.uid, complejo };
}
