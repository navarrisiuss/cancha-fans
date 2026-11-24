// GET /api/arrendatario/metricas: resumen mensual y reservas del día para los complejos del usuario
// autenticado (ownerId == uid), usando agregaciones en Firestore y proyecciones mínimas sin caché.
import "server-only";

import { TZDate } from "@date-fns/tz";
import { AggregateField, Timestamp, type Firestore } from "firebase-admin/firestore";
import { dbAdmin } from "../../../../lib/firebase/admin";
import { exigirUsuario, respuestaError } from "../../../../lib/firebase/exigir-usuario";
import { estadoVisibleReserva } from "../../../../lib/reservas-estado";
import type { HorarioAtencion } from "../../../../lib/tipos/cancha";
import type { EstadoReservaGuardado } from "../../../../lib/tipos/reserva";
import {
  diaDeLaSemana,
  esFechaValida,
  esHoraValida,
  hoyEnSantiago,
  inicioDelDia,
  inicioDelDiaSiguiente,
  instanteEnSantiago,
  ZONA_HORARIA,
} from "../../../../lib/zona-horaria";
import type {
  MetricasMensualesArrendatario,
  ReservaHoyArrendatario,
  RespuestaMetricasArrendatario,
} from "./contrato";

const PATRON_MES = /^(\d{4})-(0[1-9]|1[0-2])$/;

function leerRangoDelMes(mes: string): { primerDia: string; primerDiaMesSiguiente: string } | null {
  const coincidencia = PATRON_MES.exec(mes);
  if (!coincidencia) return null;

  const anio = Number(coincidencia[1]);
  const numMes = Number(coincidencia[2]);
  const primerDia = `${coincidencia[1]}-${coincidencia[2]}-01`;
  const primerDiaMesSiguiente =
    numMes === 12
      ? `${String(anio + 1).padStart(4, "0")}-01-01`
      : `${coincidencia[1]}-${String(numMes + 1).padStart(2, "0")}-01`;

  // Rechaza años 0000-0099 (TZDate los desplaza a 1900-1999) y 9999-12 (10000-01-01 excede el
  // formato YYYY-MM-DD y el máximo Timestamp admitido por Firestore).
  if (!esFechaValida(primerDia) || !esFechaValida(primerDiaMesSiguiente)) {
    return null;
  }

  return { primerDia, primerDiaMesSiguiente };
}

function diaSiguiente(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  // Avanzar al mediodía local evita saltos dobles u omisiones en días con cambio de horario.
  return hoyEnSantiago(new TZDate(anio, mes - 1, dia + 1, 12, 0, 0, 0, ZONA_HORARIA));
}

function calcularMinutosAbiertos(
  horarios: HorarioAtencion[],
  desdeFecha: string,
  hastaFechaExclusiva: string,
): number {
  if (horarios.length === 0) return 0;

  let msTotales = 0;
  for (let fecha = desdeFecha; fecha < hastaFechaExclusiva; fecha = diaSiguiente(fecha)) {
    const dia = diaDeLaSemana(fecha);
    for (const horarioAtencion of horarios) {
      const horario = horarioAtencion?.[dia];
      if (!horario || !esHoraValida(horario.abre) || !esHoraValida(horario.cierra)) continue;

      const apertura = instanteEnSantiago(fecha, horario.abre).getTime();
      const cierre = (
        horario.cierra === "00:00"
          ? inicioDelDiaSiguiente(fecha)
          : instanteEnSantiago(fecha, horario.cierra)
      ).getTime();

      if (cierre > apertura) {
        msTotales += cierre - apertura;
      }
    }
  }

  return msTotales / 60_000;
}

async function leerHorariosCanchasActivas(db: Firestore, uid: string): Promise<HorarioAtencion[]> {
  // Proyección vacía: obtiene únicamente las referencias/IDs de los complejos del dueño.
  const complejosSnap = await db.collection("complejos").where("ownerId", "==", uid).select().get();
  if (complejosSnap.empty) return [];

  const instantaneasCanchas = await Promise.all(
    complejosSnap.docs.map((complejoDoc) =>
      complejoDoc.ref
        .collection("canchas")
        .where("activa", "==", true)
        .select("horarioAtencion")
        .get(),
    ),
  );

  return instantaneasCanchas.flatMap((snap) =>
    snap.docs.map((doc) => doc.get("horarioAtencion") as HorarioAtencion),
  );
}

async function consultarReservasDeHoy(
  db: Firestore,
  uid: string,
  ahora: Date,
): Promise<ReservaHoyArrendatario[]> {
  const hoy = hoyEnSantiago(ahora);
  const inicioHoy = Timestamp.fromDate(inicioDelDia(hoy));
  const finHoy = Timestamp.fromDate(inicioDelDiaSiguiente(hoy));

  const instantanea = await db
    .collection("reservas")
    .where("ownerId", "==", uid)
    .where("inicio", ">=", inicioHoy)
    .where("inicio", "<", finHoy)
    .orderBy("inicio", "asc")
    .select(
      "codigo",
      "complejoNombre",
      "canchaNombre",
      "jugadorNombre",
      "inicio",
      "fin",
      "estado",
      "expiraAt",
    )
    .get();

  return instantanea.docs.map((doc) => {
    const datos = doc.data();
    const inicio = datos.inicio as Timestamp;
    const fin = datos.fin as Timestamp;
    const estadoGuardado = datos.estado as EstadoReservaGuardado;
    const expiraAt = (datos.expiraAt as Timestamp | null | undefined) ?? null;

    return {
      id: doc.id,
      codigo: String(datos.codigo ?? ""),
      complejoNombre: String(datos.complejoNombre ?? ""),
      canchaNombre: String(datos.canchaNombre ?? ""),
      jugadorNombre: String(datos.jugadorNombre ?? ""),
      inicio: inicio.toDate().toISOString(),
      fin: fin.toDate().toISOString(),
      estado: estadoVisibleReserva({ estado: estadoGuardado, expiraAt, fin }, ahora),
    };
  });
}

export async function GET(request: Request) {
  const usuario = await exigirUsuario(request);
  if (usuario instanceof Response) return usuario;

  const ahora = new Date();
  const parametros = new URL(request.url).searchParams;
  const mesRecibido = parametros.get("mes");
  const mes = mesRecibido === null ? hoyEnSantiago(ahora).slice(0, 7) : mesRecibido.trim();

  const rango = leerRangoDelMes(mes);
  if (!rango) {
    return respuestaError(400, "El filtro de mes debe tener un formato YYYY-MM válido.");
  }

  const db = dbAdmin();

  try {
    const inicioMes = Timestamp.fromDate(inicioDelDia(rango.primerDia));
    const finMes = Timestamp.fromDate(inicioDelDia(rango.primerDiaMesSiguiente));

    const reservasDelMes = db
      .collection("reservas")
      .where("ownerId", "==", usuario.uid)
      .where("inicio", ">=", inicioMes)
      .where("inicio", "<", finMes);

    const pagadasDelMes = reservasDelMes.where("estado", "==", "pagada");

    // Se separa la suma de duracionMin de los montos financieros para no descartar reservas
    // antiguas que carecen de duracionMin al calcular conteo, ventas y cobrado en línea.
    const agregacionFinanzasPagadas = pagadasDelMes.aggregate({
      reservasPagadas: AggregateField.count(),
      ventas: AggregateField.sum("precioTotal"),
      cobradoEnLinea: AggregateField.sum("montoPagado"),
    });

    const agregacionDuracionPagadas = pagadasDelMes.aggregate({
      minutosPagados: AggregateField.sum("duracionMin"),
    });

    const agregacionCanceladas = reservasDelMes.where("estado", "==", "cancelada").aggregate({
      canceladas: AggregateField.count(),
    });

    const [reservasHoy, snapFinanzas, snapDuracion, snapCanceladas, horariosActivos] =
      await Promise.all([
        consultarReservasDeHoy(db, usuario.uid, ahora),
        agregacionFinanzasPagadas.get(),
        agregacionDuracionPagadas.get(),
        agregacionCanceladas.get(),
        leerHorariosCanchasActivas(db, usuario.uid),
      ]);

    const datosFinanzas = snapFinanzas.data();
    const datosDuracion = snapDuracion.data();
    const datosCanceladas = snapCanceladas.data();
    const minutosPagados = Number(datosDuracion.minutosPagados ?? 0);
    const minutosAbiertos = calcularMinutosAbiertos(
      horariosActivos,
      rango.primerDia,
      rango.primerDiaMesSiguiente,
    );

    const metricas: MetricasMensualesArrendatario = {
      reservasPagadas: Number(datosFinanzas.reservasPagadas ?? 0),
      ventas: Number(datosFinanzas.ventas ?? 0),
      cobradoEnLinea: Number(datosFinanzas.cobradoEnLinea ?? 0),
      canceladas: Number(datosCanceladas.canceladas ?? 0),
      ocupacion: minutosAbiertos > 0 ? minutosPagados / minutosAbiertos : null,
    };

    const respuesta: RespuestaMetricasArrendatario = {
      mes,
      metricas,
      reservasHoy,
    };

    return Response.json(respuesta, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("No se pudieron calcular las métricas del arrendatario.", error);
    return Response.json(
      { error: "No pudimos cargar las métricas. Intenta nuevamente." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
