// Constantes de negocio de la plataforma (ver "Reglas de negocio" en CLAUDE.md). Son valores
// globales: no se configuran por complejo ni por cancha. Cambiarlos requiere confirmación del equipo.
//
// Módulo sin "server-only" ni "client-only": son constantes puras, así que las puede importar
// tanto el servidor (Route Handlers que calculan disponibilidad, montos y cancelableHasta) como el
// cliente (textos de interfaz como "seña del 30%").

const MS_POR_HORA = 60 * 60 * 1000;

// Un bloque que empieza en menos de 3 h desde ahora no se muestra como disponible.
export const ANTICIPACION_MINIMA_HORAS = 3;
export const ANTICIPACION_MINIMA_MS = ANTICIPACION_MINIMA_HORAS * MS_POR_HORA;

// El jugador cancela sin costo hasta 1 h después de hacer la reserva (no antes del partido).
// Con esto se calcula cancelableHasta = createdAt + VENTANA_CANCELACION_MS.
export const VENTANA_CANCELACION_HORAS = 1;
export const VENTANA_CANCELACION_MS = VENTANA_CANCELACION_HORAS * MS_POR_HORA;

// La anticipación mínima debe ser mayor que la ventana de cancelación: así la ventana siempre
// vence antes de que empiece el partido. No cambies uno de los dos valores sin revisar el otro.

// Porcentajes como enteros para mostrarlos tal cual en la interfaz ("30%") y calcular montos en
// CLP sin decimales: Math.round((monto * PORCENTAJE) / 100).

// Seña: el jugador puede pagar el 30% del total y el saldo en el complejo.
export const PORCENTAJE_SENA = 30;

// Si el jugador cancela fuera de la ventana de cancelación, pierde este porcentaje del monto
// pagado. Coincide con la seña pero es otra regla: cambiar una no debe cambiar la otra.
// Si cancela el arrendatario no hay penalización, sin importar el momento.
export const PORCENTAJE_PENALIZACION_CANCELACION = 30;

// Comisión de la plataforma sobre el monto de las reservas pagadas.
export const PORCENTAJE_COMISION = 6;
