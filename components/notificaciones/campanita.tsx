"use client";

// Campanita de notificaciones del encabezado. Va en cliente porque necesita la sesión de Firebase
// Auth y, más adelante, leer Firestore desde el navegador.
//
// ESTADO ACTUAL: stub que no pinta nada. La rama feat/notificaciones-y-correo lo reemplaza por la
// campanita real (contador de no leídas con count() y lista con historial). Los encabezados ya la
// montan, así que cuando entre aparece sin tocar nada más. Lee la sesión por sí misma.
//
// `claro` es para fondos oscuros (el encabezado de la landing, sobre la foto): ícono y texto
// blancos en vez de carbón.
export function Campanita({ claro = false }: { claro?: boolean }) {
  void claro;
  return null;
}
