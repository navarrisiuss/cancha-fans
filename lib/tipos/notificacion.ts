// Documento notificaciones/{notificacionId} (ver docs/modelo-datos.md). Solo reactivas: se crean
// dentro de la misma operación que las origina, con notificar() de lib/notificaciones/notificar.ts.
// El usuario solo puede marcar `leida` desde el cliente.
import type { FechaFirestore } from "./fecha";

export type TipoNotificacion =
  | "reserva_confirmada"
  | "reserva_cancelada_jugador"
  | "reserva_cancelada_arrendatario"
  | "nueva_reserva"
  | "complejo_aprobado"
  | "complejo_rechazado"
  | "complejo_por_revisar";

export type Notificacion = {
  // Destinatario.
  userId: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  // Ruta interna a la que lleva la notificación, ej. "/mis-reservas".
  enlace: string;
  leida: boolean;
  createdAt: FechaFirestore;
};

export type NotificacionConId = Notificacion & { id: string };
