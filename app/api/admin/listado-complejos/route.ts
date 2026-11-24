// GET /api/admin/listado-complejos: listado paginado de todos los complejos con su estado y los
// datos de su dueño, exclusivo para administradores. Se pagina con cursor para acotar las lecturas
// de Firestore por llamada.
import type { Timestamp } from "firebase-admin/firestore";
import { dbAdmin } from "../../../../lib/firebase/admin";
import type { EstadoComplejo, Formato } from "../../../../lib/firebase/complejos";
import { exigirAdmin } from "../../../../lib/firebase/exigir-admin";

export type ComplejoListadoAdmin = {
  id: string;
  nombre: string;
  comuna: string;
  region: string;
  estado: EstadoComplejo;
  formatosDisponibles: Formato[];
  ownerId: string;
  duenoNombre: string | null;
  duenoEmail: string | null;
  createdAt: number;
};

export type RespuestaListadoComplejos = {
  complejos: ComplejoListadoAdmin[];
  siguienteCursor: string | null;
};

const LIMITE_PAGINA = 12;

export async function GET(request: Request) {
  const admin = await exigirAdmin(request);
  if (admin instanceof Response) return admin;

  const url = new URL(request.url);
  const cursorId = (url.searchParams.get("cursor") ?? "").trim();

  const db = dbAdmin();
  let consulta = db.collection("complejos").orderBy("createdAt", "desc");

  if (cursorId) {
    const cursorSnap = await db.collection("complejos").doc(cursorId).get();
    if (cursorSnap.exists) {
      consulta = consulta.startAfter(cursorSnap);
    }
  }

  // Pedimos LIMITE_PAGINA + 1 para saber si hay página siguiente sin hacer otra consulta.
  const resultado = await consulta.limit(LIMITE_PAGINA + 1).get();
  const hayMas = resultado.docs.length > LIMITE_PAGINA;
  const docsPagina = hayMas ? resultado.docs.slice(0, LIMITE_PAGINA) : resultado.docs;

  // Leemos una sola vez cada dueño distinto presente en esta página.
  const ownerIdsUnicos = Array.from(
    new Set(
      docsPagina
        .map((d) => d.get("ownerId"))
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );

  const mapaDuenos = new Map<string, { nombre: string | null; email: string | null }>();
  if (ownerIdsUnicos.length > 0) {
    const refsDuenos = ownerIdsUnicos.map((uid) => db.collection("users").doc(uid));
    const snapsDuenos = await db.getAll(...refsDuenos);
    for (const snap of snapsDuenos) {
      if (snap.exists) {
        mapaDuenos.set(snap.id, {
          nombre: (snap.get("displayName") as string | null | undefined) ?? null,
          email: (snap.get("email") as string | null | undefined) ?? null,
        });
      }
    }
  }

  const complejos: ComplejoListadoAdmin[] = docsPagina.map((d) => {
    const ownerId = String(d.get("ownerId") ?? "");
    const dueno = mapaDuenos.get(ownerId);
    return {
      id: d.id,
      nombre: String(d.get("nombre") ?? ""),
      comuna: String(d.get("comuna") ?? ""),
      region: String(d.get("region") ?? ""),
      estado: d.get("estado") as EstadoComplejo,
      formatosDisponibles: (d.get("formatosDisponibles") as Formato[] | undefined) ?? [],
      ownerId,
      duenoNombre: dueno?.nombre ?? null,
      duenoEmail: dueno?.email ?? null,
      createdAt: (d.get("createdAt") as Timestamp | undefined)?.toMillis() ?? 0,
    };
  });

  const siguienteCursor =
    hayMas && docsPagina.length > 0 ? docsPagina[docsPagina.length - 1].id : null;

  const cuerpo: RespuestaListadoComplejos = { complejos, siguienteCursor };
  return Response.json(cuerpo, { headers: { "Cache-Control": "no-store" } });
}
