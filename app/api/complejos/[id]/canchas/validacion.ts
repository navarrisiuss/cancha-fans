// Validación compartida del payload de una cancha para POST y PATCH en /api/complejos/[id]/canchas.
// Corre en el servidor antes de escribir con el Admin SDK, que se salta las security rules.
import "server-only";

import {
  DIAS_SEMANA,
  FORMATOS,
  type Cancha,
  type DiaSemana,
  type Formato,
  type HorarioAtencion,
  type HorarioDia,
  type Superficie,
} from "../../../../../lib/tipos/cancha";
import { esHoraValida } from "../../../../../lib/zona-horaria";

const MAX_NOMBRE = 80;
const SUPERFICIES: readonly Superficie[] = ["sintetico", "pasto_natural"];

function minutosDesdeMedianoche(hora: string): number {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas * 60 + minutos;
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

export function validarHorarioAtencion(
  valor: unknown,
  duracionBloqueMin: number,
): { horario: HorarioAtencion } | { error: string } {
  if (!esObjeto(valor)) {
    return { error: "El horario de atención no es válido." };
  }

  const parcial: Partial<HorarioAtencion> = {};

  for (const dia of DIAS_SEMANA) {
    const entrada = valor[dia];
    if (entrada === null) {
      parcial[dia] = null;
      continue;
    }
    if (!esObjeto(entrada)) {
      return { error: `El horario del día ${dia} no es válido.` };
    }
    const abre = typeof entrada.abre === "string" ? entrada.abre.trim() : "";
    const cierra = typeof entrada.cierra === "string" ? entrada.cierra.trim() : "";

    if (!esHoraValida(abre) || !esHoraValida(cierra)) {
      return { error: `Las horas del día ${dia} deben tener formato HH:mm.` };
    }
    const minAbre = minutosDesdeMedianoche(abre);
    // "00:00" en la hora de cierre representa las 24:00 (1440 minutos), igual que en disponibilidad.
    const minCierra = cierra === "00:00" ? 24 * 60 : minutosDesdeMedianoche(cierra);
    if (minCierra <= minAbre) {
      return { error: `La hora de cierre debe ser posterior a la de apertura en ${dia}.` };
    }
    if (minCierra - minAbre < duracionBloqueMin) {
      return { error: `El horario de ${dia} debe permitir al menos un bloque de ${duracionBloqueMin} minutos.` };
    }
    parcial[dia] = { abre, cierra } satisfies HorarioDia;
  }

  return { horario: parcial as HorarioAtencion };
}

export function validarDatosCancha(cuerpo: unknown): { cancha: Cancha } | { error: string } {
  if (!esObjeto(cuerpo)) {
    return { error: "Los datos de la cancha no son válidos." };
  }

  const nombre = typeof cuerpo.nombre === "string" ? cuerpo.nombre.trim() : "";
  if (!nombre) {
    return { error: "Escribe un nombre para la cancha." };
  }
  if (nombre.length > MAX_NOMBRE) {
    return { error: `El nombre de la cancha puede tener hasta ${MAX_NOMBRE} caracteres.` };
  }

  const formato = cuerpo.formato;
  if (typeof formato !== "string" || !FORMATOS.includes(formato as Formato)) {
    return { error: "Elige un formato válido (F5, F7 o F11)." };
  }

  const superficie = cuerpo.superficie;
  if (typeof superficie !== "string" || !SUPERFICIES.includes(superficie as Superficie)) {
    return { error: "Elige una superficie válida (sintético o pasto natural)." };
  }

  if (typeof cuerpo.techada !== "boolean") {
    return { error: "Indica si la cancha es techada." };
  }

  const precioPorBloque = Number(cuerpo.precioPorBloque);
  if (!Number.isInteger(precioPorBloque) || precioPorBloque <= 0) {
    return { error: "El precio por bloque debe ser un monto entero en CLP mayor a cero." };
  }

  const duracionBloqueMin = Number(cuerpo.duracionBloqueMin);
  if (!Number.isInteger(duracionBloqueMin) || duracionBloqueMin < 30 || duracionBloqueMin > 240) {
    return { error: "La duración del bloque debe ser un número entero entre 30 y 240 minutos." };
  }

  const resultadoHorario = validarHorarioAtencion(cuerpo.horarioAtencion, duracionBloqueMin);
  if ("error" in resultadoHorario) {
    return resultadoHorario;
  }

  const activa = cuerpo.activa === undefined ? true : cuerpo.activa;
  if (typeof activa !== "boolean") {
    return { error: "El estado de activación de la cancha no es válido." };
  }

  return {
    cancha: {
      nombre,
      formato: formato as Formato,
      superficie: superficie as Superficie,
      techada: cuerpo.techada,
      precioPorBloque,
      duracionBloqueMin,
      horarioAtencion: resultadoHorario.horario,
      activa,
    },
  };
}

// Combina los campos editados con la cancha existente antes de validar el documento completo.
export function mezclarDatosCancha(actual: Cancha, cambios: unknown): { cancha: Cancha } | { error: string } {
  if (!esObjeto(cambios)) {
    return { error: "Los datos enviados para actualizar la cancha no son válidos." };
  }
  const combinado: Record<string, unknown> = {
    nombre: cambios.nombre !== undefined ? cambios.nombre : actual.nombre,
    formato: cambios.formato !== undefined ? cambios.formato : actual.formato,
    superficie: cambios.superficie !== undefined ? cambios.superficie : actual.superficie,
    techada: cambios.techada !== undefined ? cambios.techada : actual.techada,
    precioPorBloque: cambios.precioPorBloque !== undefined ? cambios.precioPorBloque : actual.precioPorBloque,
    duracionBloqueMin: cambios.duracionBloqueMin !== undefined ? cambios.duracionBloqueMin : actual.duracionBloqueMin,
    horarioAtencion: cambios.horarioAtencion !== undefined ? cambios.horarioAtencion : actual.horarioAtencion,
    activa: cambios.activa !== undefined ? cambios.activa : actual.activa,
  };
  return validarDatosCancha(combinado);
}

// Calcula los formatos únicos de las canchas activas del complejo en el orden canónico F5, F7, F11.
export function calcularFormatosDisponibles(canchas: Array<Pick<Cancha, "formato" | "activa">>): Formato[] {
  const activos = new Set<Formato>();
  for (const cancha of canchas) {
    if (cancha.activa) {
      activos.add(cancha.formato);
    }
  }
  return FORMATOS.filter((f) => activos.has(f));
}

export type { DiaSemana };
