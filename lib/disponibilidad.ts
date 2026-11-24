import "server-only";

import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { ANTICIPACION_MINIMA_MS } from "./reglas";
import { ocupaElBloque } from "./reservas-estado";
import type { Bloqueo } from "./tipos/bloqueo";
import type { Cancha } from "./tipos/cancha";
import type { Reserva } from "./tipos/reserva";
import { diaDeLaSemana, inicioDelDia, inicioDelDiaSiguiente, instanteEnSantiago } from "./zona-horaria";

type Intervalo = Pick<Bloqueo, "inicio" | "fin">;
type ReservaDelDia = Pick<Reserva, "inicio" | "fin" | "estado" | "expiraAt">;

export type BloqueDisponible = {
  inicio: string;
  fin: string;
  estado: "libre" | "ocupado";
};

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
  const inicio = Timestamp.fromDate(inicioDelDia(fecha));
  const fin = Timestamp.fromDate(inicioDelDiaSiguiente(fecha));

  return {
    // Solo las reservas de una cancha en un día, incluidas las expiradas y canceladas.
    reservas: db.collection("reservas")
      .where("canchaId", "==", canchaId)
      .where("inicio", ">=", inicio)
      .where("inicio", "<", fin),
    // Un bloqueo vigente al inicio del día puede empezar antes o terminar después.
    // Se leen los bloqueos de la cancha con fin posterior, incluidos los de fechas futuras.
    bloqueos: db.collection("bloqueos")
      .where("canchaId", "==", canchaId)
      .where("fin", ">", inicio),
  };
}

export async function leerDisponibilidad(db: Firestore, complejoId: string, canchaId: string, fecha: string) {
  const complejo = db.collection("complejos").doc(complejoId);
  // Dos documentos como máximo antes de consultar las excepciones.
  const [datosComplejo, datosCancha] = await Promise.all([
    complejo.get(),
    complejo.collection("canchas").doc(canchaId).get(),
  ]);
  const cancha = datosCancha.data() as Cancha | undefined;
  if (datosComplejo.get("estado") !== "aprobado" || cancha?.activa !== true) return null;
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
