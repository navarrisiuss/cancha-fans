// Fechas y horas en America/Santiago. Chile cambia de horario dos veces al año, así que nunca se
// calculan offsets a mano: @date-fns/tz conoce las reglas de la zona. En Firestore los timestamps
// se guardan en UTC y solo se convierten al mostrar o al interpretar lo que escribe el usuario.
//
// Módulo puro: lo pueden importar tanto el servidor (disponibilidad, reservas) como el cliente.
import { TZDate } from "@date-fns/tz";
import { DIAS_SEMANA, type DiaSemana } from "./tipos/cancha";

export const ZONA_HORARIA = "America/Santiago";

// Fecha en formato "YYYY-MM-DD" (la que manda un <input type="date"> y la que recibe
// /api/disponibilidad). Hora en formato "HH:mm".
const PATRON_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const PATRON_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function esFechaValida(fecha: string): boolean {
  const partes = PATRON_FECHA.exec(fecha);
  if (!partes) return false;
  const [anio, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const construida = new TZDate(anio, mes - 1, dia, 12, 0, 0, 0, ZONA_HORARIA);
  // new TZDate(2026, 1, 31) rueda al 3 de marzo: si el día cambió, la fecha no existía.
  return construida.getFullYear() === anio && construida.getMonth() === mes - 1 && construida.getDate() === dia;
}

export function esHoraValida(hora: string): boolean {
  return PATRON_HORA.test(hora);
}

// El instante exacto en que son las `hora` de `fecha` en Chile. Ej. ("2026-11-25", "19:00") →
// 2026-11-25T22:00:00Z (verano, UTC-3). Lanza si fecha u hora no tienen el formato esperado.
export function instanteEnSantiago(fecha: string, hora: string): Date {
  const f = PATRON_FECHA.exec(fecha);
  const h = PATRON_HORA.exec(hora);
  if (!f || !h) throw new Error(`Fecha u hora inválida: "${fecha}" "${hora}".`);
  return new Date(
    new TZDate(Number(f[1]), Number(f[2]) - 1, Number(f[3]), Number(h[1]), Number(h[2]), 0, 0, ZONA_HORARIA).getTime(),
  );
}

// Medianoche de `fecha` en Chile, como instante. Con instanteEnSantiago(fecha, "00:00").
export function inicioDelDia(fecha: string): Date {
  return instanteEnSantiago(fecha, "00:00");
}

// Instante en que empieza el día siguiente en Chile. Sirve para consultar "todo lo de esta fecha"
// como inicio >= inicioDelDia(fecha) y inicio < inicioDelDiaSiguiente(fecha). No suma 24 h: el día
// del cambio de horario dura 23 o 25.
export function inicioDelDiaSiguiente(fecha: string): Date {
  const f = PATRON_FECHA.exec(fecha);
  if (!f) throw new Error(`Fecha inválida: "${fecha}".`);
  return new Date(new TZDate(Number(f[1]), Number(f[2]) - 1, Number(f[3]) + 1, 0, 0, 0, 0, ZONA_HORARIA).getTime());
}

// Día de la semana de `fecha`, con la clave que usa horarioAtencion.
export function diaDeLaSemana(fecha: string): DiaSemana {
  const f = PATRON_FECHA.exec(fecha);
  if (!f) throw new Error(`Fecha inválida: "${fecha}".`);
  // getDay(): 0 = domingo. DIAS_SEMANA empieza en lunes.
  const dia = new TZDate(Number(f[1]), Number(f[2]) - 1, Number(f[3]), 12, 0, 0, 0, ZONA_HORARIA).getDay();
  return DIAS_SEMANA[(dia + 6) % 7];
}

// La fecha de hoy en Chile como "YYYY-MM-DD". Distinta de new Date().toISOString().slice(0, 10),
// que da la fecha en UTC y entre las 21:00 y las 24:00 de Chile ya marca el día siguiente.
export function hoyEnSantiago(ahora: Date = new Date()): string {
  const t = new TZDate(ahora.getTime(), ZONA_HORARIA);
  const mes = String(t.getMonth() + 1).padStart(2, "0");
  const dia = String(t.getDate()).padStart(2, "0");
  return `${t.getFullYear()}-${mes}-${dia}`;
}

// Fecha y hora legibles para el usuario, siempre en hora de Chile aunque su navegador esté en otra
// zona. Ej. "mar 25 nov, 19:00".
export function formatearFechaHora(instante: Date | number): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: ZONA_HORARIA,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instante);
}

// Solo la hora, "19:00".
export function formatearHora(instante: Date | number): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: ZONA_HORARIA,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instante);
}
