// fetch a nuestros Route Handlers con el ID token de la sesión en la cabecera Authorization, que es
// lo que validan exigirUsuario, exigirDuenoDeComplejo y exigirAdmin en el servidor. Solo en el
// navegador: el token vive en Firebase Auth.
//
// Llámalo cuando la sesión ya esté confirmada (useSesion con cargando en false). Sin sesión se
// manda un token vacío y el servidor responde 401.
import "client-only";

import { auth } from "./client";

export async function fetchConSesion(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...init,
    cache: "no-store",
    headers: { ...init.headers, Authorization: `Bearer ${token ?? ""}` },
  });
}
