// Punto de integración entre lotes: los Route Handlers de reservas, cancelaciones y revisión de
// complejos llaman a notificar() cuando algo le importa a un usuario. La firma es un contrato: no
// cambia sin avisar.
//
// ESTADO ACTUAL: stub que no hace nada. La rama feat/notificaciones-y-correo lo reemplaza por la
// implementación real (documento en notificaciones/{id} más correo con Resend). Quien lo llame ya
// puede hacerlo: cuando la implementación entre, las notificaciones empiezan a aparecer solas.
//
// Corre solo en el servidor (usa el Admin SDK y la clave de Resend).
import "server-only";

import type { TipoNotificacion } from "../tipos/notificacion";

export type DatosNotificacion = {
  // Destinatario (uid de Firebase Auth).
  userId: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  // Ruta interna a la que lleva la notificación, ej. "/mis-reservas".
  enlace: string;
};

// Una llamada que falla no debe romper la operación que la origina: la reserva ya está pagada aunque
// el aviso no llegue. La implementación real debe capturar sus errores y no relanzarlos.
export async function notificar(datos: DatosNotificacion): Promise<void> {
  void datos;
}
