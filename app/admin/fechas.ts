// Fecha legible en hora de Chile. Se fija la zona: el navegador del admin podría estar en otra.
export function formatearFecha(milisegundos: number): string {
  return new Date(milisegundos).toLocaleDateString("es-CL", {
    timeZone: "America/Santiago",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
