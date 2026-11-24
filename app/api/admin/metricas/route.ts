// GET /api/admin/metricas: métricas de reservas pagadas, GMV (suma de precioTotal) y comisión de la
// plataforma (suma de comision, 6%), con filtro opcional por mes (?mes=YYYY-MM). Usa agregaciones
// count() y sum() de Firestore en vez de descargar cada documento de la colección reservas.
import { AggregateField, Timestamp, type Query } from "firebase-admin/firestore";
import { dbAdmin } from "../../../../lib/firebase/admin";
import { exigirAdmin } from "../../../../lib/firebase/exigir-admin";
import { respuestaError } from "../../../../lib/firebase/exigir-usuario";
import { inicioDelDia } from "../../../../lib/zona-horaria";

export type RespuestaMetricasAdmin = {
  mes: string | null;
  reservasPagadas: number;
  gmv: number;
  comision: number;
};

const PATRON_MES = /^(\d{4})-(0[1-9]|1[0-2])$/;

function rangoDelMesEnSantiago(mes: string): { inicio: Date; fin: Date } | null {
  const coincidencia = PATRON_MES.exec(mes);
  if (!coincidencia) return null;

  const anio = Number(coincidencia[1]);
  const numMes = Number(coincidencia[2]);
  const primerDia = `${anio}-${String(numMes).padStart(2, "0")}-01`;
  const primerDiaMesSiguiente =
    numMes === 12
      ? `${anio + 1}-01-01`
      : `${anio}-${String(numMes + 1).padStart(2, "0")}-01`;

  return {
    inicio: inicioDelDia(primerDia),
    fin: inicioDelDia(primerDiaMesSiguiente),
  };
}

export async function GET(request: Request) {
  const admin = await exigirAdmin(request);
  if (admin instanceof Response) return admin;

  const url = new URL(request.url);
  const mesParam = (url.searchParams.get("mes") ?? "").trim();

  let rango: { inicio: Date; fin: Date } | null = null;
  if (mesParam) {
    rango = rangoDelMesEnSantiago(mesParam);
    if (!rango) {
      return respuestaError(400, "El filtro de mes debe tener formato YYYY-MM.");
    }
  }

  let consulta: Query = dbAdmin().collection("reservas").where("estado", "==", "pagada");
  if (rango) {
    consulta = consulta
      .where("inicio", ">=", Timestamp.fromDate(rango.inicio))
      .where("inicio", "<", Timestamp.fromDate(rango.fin));
  }

  const agregacion = consulta.aggregate({
    reservasPagadas: AggregateField.count(),
    gmv: AggregateField.sum("precioTotal"),
    comision: AggregateField.sum("comision"),
  });

  const instantanea = await agregacion.get();
  const datos = instantanea.data();

  const respuesta: RespuestaMetricasAdmin = {
    mes: mesParam || null,
    reservasPagadas: Number(datos.reservasPagadas ?? 0),
    gmv: Number(datos.gmv ?? 0),
    comision: Number(datos.comision ?? 0),
  };

  return Response.json(respuesta, { headers: { "Cache-Control": "no-store" } });
}
