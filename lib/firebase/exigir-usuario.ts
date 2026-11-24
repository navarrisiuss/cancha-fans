// Guard de los endpoints que piden una sesión iniciada (reservar, pagar, cancelar...). Corre solo
// en el servidor: es la protección real, porque ocultar un botón en el navegador no impide llamar
// a la API desde la consola. Los endpoints exclusivos del admin usan exigirAdmin, que se apoya
// en este.
import "server-only";

import { authAdmin } from "./admin";

// Respuesta de error en JSON. no-store: un error de autorización nunca debe quedar en caché.
export function respuestaError(estado: 400 | 401 | 403 | 404 | 409, mensaje: string) {
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
//   const resultado = await exigirUsuario(request);
//   if (resultado instanceof Response) return resultado;
//   // resultado.uid es quien hizo la llamada
//
// El cliente manda su ID token de Firebase en la cabecera `Authorization: Bearer <token>` (con
// fetchConSesion, o `usuario.getIdToken()` a mano). Costo: 0 lecturas de Firestore, solo se
// verifica la firma del token.
export async function exigirUsuario(request: Request): Promise<{ uid: string } | Response> {
  const cabecera = request.headers.get("authorization") ?? "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice("Bearer ".length).trim() : "";
  // Sin token se responde antes de tocar el Admin SDK.
  if (!token) {
    return respuestaError(401, "Inicia sesión para continuar.");
  }

  try {
    const { uid } = await authAdmin().verifyIdToken(token);
    return { uid };
  } catch (error) {
    if (esErrorDeToken(error)) {
      return respuestaError(401, "Inicia sesión para continuar.");
    }
    throw error;
  }
}
