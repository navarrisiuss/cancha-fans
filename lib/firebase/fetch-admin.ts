// fetch a los endpoints de admin con el ID token de la sesión en la cabecera Authorization, que es
// lo que valida exigirAdmin en el servidor. Solo en el navegador: el token vive en Firebase Auth.
// Se usa dentro de /admin, donde el guard ya confirmó la sesión; sin sesión el servidor responde 401.
import "client-only";

import { auth } from "./client";

export async function fetchAdmin(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...init,
    cache: "no-store",
    headers: { ...init.headers, Authorization: `Bearer ${token ?? ""}` },
  });
}
