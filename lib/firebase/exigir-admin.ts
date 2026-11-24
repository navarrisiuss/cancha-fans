// Guard de los endpoints exclusivos del admin. Corre solo en el servidor: es la protección real,
// porque ocultar /admin en el navegador no impide llamar a la API desde la consola.
import "server-only";

import { dbAdmin } from "./admin";
import { exigirUsuario, respuestaError } from "./exigir-usuario";

// Uso en un Route Handler:
//   const resultado = await exigirAdmin(request);
//   if (resultado instanceof Response) return resultado;
//   // resultado.uid es el admin que hizo la llamada
//
// El cliente manda su ID token de Firebase en la cabecera `Authorization: Bearer <token>`
// (se obtiene con `usuario.getIdToken()`). Costo: 1 lectura de Firestore por llamada.
export async function exigirAdmin(request: Request): Promise<{ uid: string } | Response> {
  const usuario = await exigirUsuario(request);
  if (usuario instanceof Response) {
    return usuario;
  }

  // isAdmin vive en users/{uid} y solo se activa a mano en la consola (docs/modelo-datos.md).
  const documento = await dbAdmin().collection("users").doc(usuario.uid).get();
  if (documento.get("isAdmin") !== true) {
    return respuestaError(403, "No tienes permisos de administrador.");
  }

  return usuario;
}
