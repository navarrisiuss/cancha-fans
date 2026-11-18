// GET /api/admin/complejos/{id}: todo lo que el admin necesita para revisar una postulación, solo
// para admin. Incluye los datos legales de privado/datos, que nunca deben llegar a otro usuario;
// por eso va en un Route Handler protegido con exigirAdmin y no en una página de servidor.
import type { Timestamp } from "firebase-admin/firestore";
import { dbAdmin } from "../../../../../lib/firebase/admin";
import { exigirAdmin } from "../../../../../lib/firebase/exigir-admin";
import type { DatosLegales, EstadoComplejo, Formato } from "../../../../../lib/firebase/complejos";

export type DetalleComplejo = {
  id: string;
  nombre: string;
  descripcion: string;
  region: string;
  comuna: string;
  direccion: string;
  fotos: string[];
  estado: EstadoComplejo;
  notaAdmin: string | null;
  createdAt: number;
  // null si el documento privado no existe (no debería pasar: se crea en el mismo batch).
  legales: DatosLegales | null;
  canchas: { id: string; nombre: string; formato: Formato; precioPorBloque: number; activa: boolean }[];
};

const sinCache = { "Cache-Control": "no-store" };

export async function GET(request: Request, ctx: RouteContext<"/api/admin/complejos/[id]">) {
  const admin = await exigirAdmin(request);
  if (admin instanceof Response) return admin;

  const { id } = await ctx.params;
  const complejo = dbAdmin().collection("complejos").doc(id);
  // Cuesta 2 lecturas más 1 por cancha. Las tres consultas van en paralelo.
  const [datos, privado, canchas] = await Promise.all([
    complejo.get(),
    complejo.collection("privado").doc("datos").get(),
    complejo.collection("canchas").get(),
  ]);

  if (!datos.exists) {
    return Response.json({ error: "El complejo no existe." }, { status: 404, headers: sinCache });
  }

  const detalle: DetalleComplejo = {
    id,
    nombre: datos.get("nombre"),
    descripcion: datos.get("descripcion"),
    region: datos.get("region"),
    comuna: datos.get("comuna"),
    direccion: datos.get("direccion"),
    fotos: datos.get("fotos") ?? [],
    estado: datos.get("estado"),
    notaAdmin: datos.get("notaAdmin") ?? null,
    createdAt: (datos.get("createdAt") as Timestamp | undefined)?.toMillis() ?? 0,
    legales: privado.exists
      ? { rut: privado.get("rut"), razonSocial: privado.get("razonSocial"), datosBancarios: privado.get("datosBancarios") }
      : null,
    canchas: canchas.docs.map((c) => ({
      id: c.id,
      nombre: c.get("nombre"),
      formato: c.get("formato"),
      precioPorBloque: c.get("precioPorBloque"),
      activa: c.get("activa"),
    })),
  };

  return Response.json(detalle, { headers: sinCache });
}
