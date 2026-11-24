import "server-only";

import { esIdDeDocumento, leerDisponibilidadSemana } from "../../../../lib/disponibilidad";
import { dbAdmin } from "../../../../lib/firebase/admin";
import { esFechaValida, hoyEnSantiago } from "../../../../lib/zona-horaria";

function responder(estado: number, cuerpo: object) {
  return Response.json(cuerpo, { status: estado, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const parametros = new URL(request.url).searchParams;
  const complejoId = parametros.get("complejoId");
  const canchaId = parametros.get("canchaId");
  const desde = parametros.get("desde");

  if (!esIdDeDocumento(complejoId) || !esIdDeDocumento(canchaId) || !desde || !esFechaValida(desde)) {
    return responder(400, { error: "Indica un complejo, una cancha y una fecha válida." });
  }

  try {
    const hoy = hoyEnSantiago();
    const dias = await leerDisponibilidadSemana(dbAdmin(), complejoId, canchaId, desde < hoy ? hoy : desde);
    if (!dias) return responder(404, { error: "La cancha ya no está disponible." });

    return responder(200, {
      dias: dias.map(({ fecha, bloques }) => ({
        fecha,
        bloques: bloques.map(({ inicio, fin, estado }) => ({
          inicio: inicio.toISOString(),
          fin: fin.toISOString(),
          estado,
        })),
      })),
    });
  } catch (error) {
    console.error("No se pudo consultar la disponibilidad semanal.", error);
    return responder(500, { error: "No pudimos cargar los horarios. Intenta nuevamente." });
  }
}
