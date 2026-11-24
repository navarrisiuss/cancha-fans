import "server-only";

import { esIdDeDocumento, leerDisponibilidad } from "../../../lib/disponibilidad";
import { dbAdmin } from "../../../lib/firebase/admin";
import { esFechaValida } from "../../../lib/zona-horaria";

function responder(estado: number, cuerpo: object) {
  return Response.json(cuerpo, { status: estado, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const parametros = new URL(request.url).searchParams;
  const complejoId = parametros.get("complejoId");
  const canchaId = parametros.get("canchaId");
  const fecha = parametros.get("fecha");

  if (!esIdDeDocumento(complejoId) || !esIdDeDocumento(canchaId) || !fecha || !esFechaValida(fecha)) {
    return responder(400, { error: "Indica un complejo, una cancha y una fecha válida." });
  }

  try {
    const bloques = await leerDisponibilidad(dbAdmin(), complejoId, canchaId, fecha);
    if (!bloques) return responder(404, { error: "La cancha ya no está disponible." });

    return responder(200, {
      bloques: bloques.map(({ inicio, fin, estado }) => ({
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
        estado,
      })),
    });
  } catch (error) {
    console.error("No se pudo consultar la disponibilidad.", error);
    return responder(500, { error: "No pudimos cargar los horarios. Intenta nuevamente." });
  }
}
