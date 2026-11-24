// GET /api/admin/usuarios: listado paginado de cuentas registradas en users/{uid}, protegido con
// exigirAdmin. Usa paginación por cursor para no leer toda la colección en una sola llamada.
import type { Timestamp } from "firebase-admin/firestore";
import { dbAdmin } from "../../../../lib/firebase/admin";
import { exigirAdmin } from "../../../../lib/firebase/exigir-admin";

export type UsuarioListadoAdmin = {
  id: string;
  email: string;
  displayName: string | null;
  phone: string | null;
  isAdmin: boolean;
  createdAt: number;
};

export type RespuestaListadoUsuarios = {
  usuarios: UsuarioListadoAdmin[];
  siguienteCursor: string | null;
};

const LIMITE_PAGINA = 15;

export async function GET(request: Request) {
  const admin = await exigirAdmin(request);
  if (admin instanceof Response) return admin;

  const url = new URL(request.url);
  const cursorId = (url.searchParams.get("cursor") ?? "").trim();

  const db = dbAdmin();
  let consulta = db.collection("users").orderBy("createdAt", "desc");

  if (cursorId) {
    const cursorSnap = await db.collection("users").doc(cursorId).get();
    if (cursorSnap.exists) {
      consulta = consulta.startAfter(cursorSnap);
    }
  }

  const resultado = await consulta.limit(LIMITE_PAGINA + 1).get();
  const hayMas = resultado.docs.length > LIMITE_PAGINA;
  const docsPagina = hayMas ? resultado.docs.slice(0, LIMITE_PAGINA) : resultado.docs;

  const usuarios: UsuarioListadoAdmin[] = docsPagina.map((d) => ({
    id: d.id,
    email: String(d.get("email") ?? ""),
    displayName: (d.get("displayName") as string | null | undefined) ?? null,
    phone: (d.get("phone") as string | null | undefined) ?? null,
    isAdmin: d.get("isAdmin") === true,
    createdAt: (d.get("createdAt") as Timestamp | undefined)?.toMillis() ?? 0,
  }));

  const siguienteCursor =
    hayMas && docsPagina.length > 0 ? docsPagina[docsPagina.length - 1].id : null;

  const cuerpo: RespuestaListadoUsuarios = { usuarios, siguienteCursor };
  return Response.json(cuerpo, { headers: { "Cache-Control": "no-store" } });
}
