// GET /api/admin/complejos: cola de complejos en revisión, solo para admin. Se lee con el Admin SDK
// en un Route Handler y no en una página de servidor: la sesión vive en el navegador, así que una
// página no sabría quién la pide y mandaría los datos a cualquiera. Acá exigirAdmin valida el token.
import type { Timestamp } from "firebase-admin/firestore";
import { dbAdmin } from "../../../../lib/firebase/admin";
import { exigirAdmin } from "../../../../lib/firebase/exigir-admin";

export type ComplejoEnCola = {
  id: string;
  nombre: string;
  comuna: string;
  region: string;
  // Milisegundos desde 1970: JSON no tiene fechas.
  createdAt: number;
};

export async function GET(request: Request) {
  const admin = await exigirAdmin(request);
  if (admin instanceof Response) return admin;

  // Cuesta 1 lectura por complejo pendiente. Se ordena en memoria (los más antiguos primero, para
  // revisarlos en orden de llegada): un orderBy junto al where exigiría un índice compuesto.
  const resultado = await dbAdmin().collection("complejos").where("estado", "==", "en_revision").get();
  const cola: ComplejoEnCola[] = resultado.docs
    .map((d) => ({
      id: d.id,
      nombre: d.get("nombre"),
      comuna: d.get("comuna"),
      region: d.get("region"),
      createdAt: (d.get("createdAt") as Timestamp | undefined)?.toMillis() ?? 0,
    }))
    .sort((a, b) => a.createdAt - b.createdAt);

  return Response.json(cola, { headers: { "Cache-Control": "no-store" } });
}
