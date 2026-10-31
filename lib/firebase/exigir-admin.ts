// Guard de los endpoints exclusivos del admin. Corre solo en el servidor: es la protección real,
// porque ocultar /admin en el navegador no impide llamar a la API desde la consola.
import "server-only";

import { authAdmin, dbAdmin } from "./admin";

// Respuesta de error en JSON. no-store: un 401 o 403 nunca debe quedar en caché.
function respuestaError(estado: 401 | 403, mensaje: string) {
  return Response.json({ error: mensaje }, { status: estado, headers: { "Cache-Control": "no-store" } });
}

// Los errores de verificación del Admin SDK traen un código "auth/..." (token vencido, mal
// formado, de otro proyecto). Cualquier otro error es del sistema y debe verse como 500.
function esErrorDeToken(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.startsWith("auth/")
  );
}

// Uso en un Route Handler:
//   const resultado = await exigirAdmin(request);
//   if (resultado instanceof Response) return resultado;
//   // resultado.uid es el admin que hizo la llamada
//
// El cliente manda su ID token de Firebase en la cabecera `Authorization: Bearer <token>`
// (se obtiene con `usuario.getIdToken()`). Costo: 1 lectura de Firestore por llamada.
export async function exigirAdmin(request: Request): Promise<{ uid: string } | Response> {
  const cabecera = request.headers.get("authorization") ?? "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice("Bearer ".length).trim() : "";
  // Sin token se responde antes de tocar el Admin SDK.
  if (!token) {
    return respuestaError(401, "Inicia sesión para continuar.");
  }

  let uid: string;
  try {
    ({ uid } = await authAdmin().verifyIdToken(token));
  } catch (error) {
    if (esErrorDeToken(error)) {
      return respuestaError(401, "Inicia sesión para continuar.");
    }
    throw error;
  }

  // isAdmin vive en users/{uid} y solo se activa a mano en la consola (docs/modelo-datos.md).
  const usuario = await dbAdmin().collection("users").doc(uid).get();
  if (usuario.get("isAdmin") !== true) {
    return respuestaError(403, "No tienes permisos de administrador.");
  }

  return { uid };
}
