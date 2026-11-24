import "server-only";

import { TZDate } from "@date-fns/tz";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { ANTICIPACION_MINIMA_MS } from "./reglas";
import { ocupaElBloque } from "./reservas-estado";
import type { Bloqueo } from "./tipos/bloqueo";
import type { Cancha } from "./tipos/cancha";
import type { Reserva } from "./tipos/reserva";
import {
  diaDeLaSemana,
  hoyEnSantiago,
  inicioDelDia,
  inicioDelDiaSiguiente,
  instanteEnSantiago,
  ZONA_HORARIA,
} from "./zona-horaria";

type Intervalo = Pick<Bloqueo, "inicio" | "fin">;
type ReservaDelDia = Pick<Reserva, "inicio" | "fin" | "estado" | "expiraAt">;

export type BloqueDisponible = {
  inicio: string;
  fin: string;
  estado: "libre" | "ocupado";
};

export type DiaDisponible = { fecha: string; bloques: BloqueDisponible[] };

type Bloque = Omit<BloqueDisponible, "inicio" | "fin"> & { inicio: Date; fin: Date };

export function seSuperponen(intervalo: Intervalo, inicio: number, fin: number): boolean {
  return intervalo.inicio.toMillis() < fin && intervalo.fin.toMillis() > inicio;
}

export function calcularBloques(
  cancha: Cancha,
  fecha: string,
  reservas: ReservaDelDia[],
  bloqueos: Intervalo[],
  ahora: Date,
): Bloque[] {
  const horario = cancha.horarioAtencion[diaDeLaSemana(fecha)];
  const duracion = cancha.duracionBloqueMin * 60_000;
  if (!horario || !Number.isSafeInteger(duracion) || duracion <= 0) return [];

  const apertura = instanteEnSantiago(fecha, horario.abre).getTime();
  const cierre = (horario.cierra === "00:00"
    ? inicioDelDiaSiguiente(fecha)
    : instanteEnSantiago(fecha, horario.cierra)).getTime();
  const minimo = ahora.getTime() + ANTICIPACION_MINIMA_MS;
  const intervalos = [...reservas.filter((reserva) => ocupaElBloque(reserva, ahora)), ...bloqueos];
  const bloques: Bloque[] = [];

  for (let inicio = apertura; inicio + duracion <= cierre; inicio += duracion) {
    if (inicio < minimo) continue;
    const fin = inicio + duracion;
    const ocupado = intervalos.some((intervalo) => seSuperponen(intervalo, inicio, fin));
    bloques.push({ inicio: new Date(inicio), fin: new Date(fin), estado: ocupado ? "ocupado" : "libre" });
  }

  return bloques;
}

export function esIdDeDocumento(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim() === valor && valor.length > 0 &&
    Buffer.byteLength(valor, "utf8") <= 1500 && !valor.includes("/") &&
    valor !== "." && valor !== ".." && !/^__.*__$/.test(valor);
}

export function consultasDelDia(db: Firestore, canchaId: string, fecha: string) {
  return consultasDeRango(db, canchaId, fecha, 1);
}

function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  // El mediodía evita las transiciones de medianoche al avanzar por fechas del calendario.
  return hoyEnSantiago(new TZDate(anio, mes - 1, dia + dias, 12, ZONA_HORARIA));
}

export function consultasDeRango(db: Firestore, canchaId: string, desde: string, dias: number) {
  const inicio = Timestamp.fromDate(inicioDelDia(desde));
  const fin = Timestamp.fromDate(inicioDelDia(sumarDias(desde, dias)));

  return {
    // Reservas de una sola cancha en el rango, incluidas las expiradas y canceladas.
    reservas: db.collection("reservas")
      .where("canchaId", "==", canchaId)
      .where("inicio", ">=", inicio)
      .where("inicio", "<", fin),
    // Bloqueos de una sola cancha con fin posterior al inicio. Incluye los que cruzan ese
    // límite y los futuros, que se descartan en memoria cuando quedan fuera del rango.
    bloqueos: db.collection("bloqueos")
      .where("canchaId", "==", canchaId)
      .where("fin", ">", inicio),
  };
}

async function leerCanchaDisponible(db: Firestore, complejoId: string, canchaId: string) {
  const complejo = db.collection("complejos").doc(complejoId);
  // Dos documentos como máximo antes de consultar las excepciones.
  const [datosComplejo, datosCancha] = await Promise.all([
    complejo.get(),
    complejo.collection("canchas").doc(canchaId).get(),
  ]);
  const cancha = datosCancha.data() as Cancha | undefined;
  if (datosComplejo.get("estado") !== "aprobado" || cancha?.activa !== true) return null;
  return cancha;
}

export async function leerDisponibilidad(db: Firestore, complejoId: string, canchaId: string, fecha: string) {
  const cancha = await leerCanchaDisponible(db, complejoId, canchaId);
  if (!cancha) return null;
  if (!cancha.horarioAtencion[diaDeLaSemana(fecha)]) return [];

  const consultas = consultasDelDia(db, canchaId, fecha);
  const [reservas, bloqueos] = await Promise.all([consultas.reservas.get(), consultas.bloqueos.get()]);

  return calcularBloques(
    cancha,
    fecha,
    reservas.docs.map((doc) => doc.data() as Reserva).filter((reserva) => reserva.complejoId === complejoId),
    bloqueos.docs.map((doc) => doc.data() as Bloqueo).filter((bloqueo) => bloqueo.complejoId === complejoId),
    new Date(),
  );
}

export async function leerDisponibilidadSemana(db: Firestore, complejoId: string, canchaId: string, desde: string) {
  const cancha = await leerCanchaDisponible(db, complejoId, canchaId);
  if (!cancha) return null;

  const dias = 7;
  const consultas = consultasDeRango(db, canchaId, desde, dias);
  const [reservas, bloqueos] = await Promise.all([consultas.reservas.get(), consultas.bloqueos.get()]);
  const fin = inicioDelDia(sumarDias(desde, dias)).getTime();
  const reservasDelRango = reservas.docs.map((doc) => doc.data() as Reserva)
    .filter((reserva) => reserva.complejoId === complejoId);
  const bloqueosDelRango = bloqueos.docs.map((doc) => doc.data() as Bloqueo)
    .filter((bloqueo) => bloqueo.complejoId === complejoId && bloqueo.inicio.toMillis() < fin);
  const ahora = new Date();

  return Array.from({ length: dias }, (_, indice) => {
    const fecha = sumarDias(desde, indice);
    const bloques = calcularBloques(cancha, fecha, reservasDelRango, bloqueosDelRango, ahora);
    return { fecha, bloques };
  });
}
