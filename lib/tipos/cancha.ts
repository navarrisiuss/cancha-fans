// Documento complejos/{complejoId}/canchas/{canchaId} (ver docs/modelo-datos.md). Tipos puros, sin
// SDK: se pueden importar desde servidor y cliente.
//
// Las canchas se escriben solo desde Route Handlers con el Admin SDK, porque cada cambio también
// actualiza `formatosDisponibles` del complejo en el mismo batch.

export type Formato = "F5" | "F7" | "F11";
export const FORMATOS: readonly Formato[] = ["F5", "F7", "F11"];

export type Superficie = "sintetico" | "pasto_natural";

// Claves de horarioAtencion. Sin tildes a propósito: son claves de un objeto en Firestore, no texto
// de interfaz. Para mostrarlas al usuario, escríbelas con tilde ("miércoles", "sábado").
export const DIAS_SEMANA = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];

// Horas en "HH:mm", zona America/Santiago. null significa cerrado ese día.
export type HorarioDia = { abre: string; cierra: string } | null;
export type HorarioAtencion = Record<DiaSemana, HorarioDia>;

// Campos que escribe el arrendatario. createdAt y updatedAt los pone el servidor.
export type Cancha = {
  // Ej. "F5 #2". El nombre completo en pantalla es "Los Leones · F5 #2".
  nombre: string;
  formato: Formato;
  superficie: Superficie;
  techada: boolean;
  // CLP, entero. Precio único por cancha: no hay tarifa peak ni valle.
  precioPorBloque: number;
  // Típicamente 60.
  duracionBloqueMin: number;
  horarioAtencion: HorarioAtencion;
  // Permite ocultar una cancha sin borrarla.
  activa: boolean;
};

export type CanchaConId = Cancha & { id: string };
