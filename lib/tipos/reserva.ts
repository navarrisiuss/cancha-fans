// Documento reservas/{reservaId} (ver docs/modelo-datos.md). Tipos puros, sin SDK.
//
// Las reservas se crean y cambian de estado SOLO desde Route Handlers con el Admin SDK. El cliente
// las lee (Mis reservas, panel del arrendatario) bajo las security rules.
import type { Formato } from "./cancha";
import type { FechaFirestore } from "./fecha";

// Estados que se guardan en Firestore. "jugada" no está: no hay cron, se deriva al leer comparando
// `fin` con la hora actual (ver estadoVisibleReserva en lib/reservas-estado.ts).
export type EstadoReservaGuardado = "pendiente_pago" | "pagada" | "cancelada" | "expirada";

// Estados que ve el usuario: los guardados más "jugada".
export type EstadoReserva = EstadoReservaGuardado | "jugada";

export type TipoPago = "total" | "sena";

export type QuienCancela = "jugador" | "arrendatario";

export type Reserva = {
  // Legible, tipo "A-10482". Se genera al crear.
  codigo: string;

  jugadorId: string;
  jugadorNombre: string;
  jugadorEmail: string;
  // Los pide el checkout antes de pagar (RUT normalizado "12345678-5", teléfono "+56912345678") y
  // los ve el dueño en Reservas recibidas. Opcionales: las reservas anteriores al checkout con datos
  // no los tienen, y quedan en null mientras la reserva no se paga.
  jugadorRut?: string | null;
  jugadorTelefono?: string | null;

  // Denormalizado: "Mis reservas" se pinta con una sola consulta y el precio es histórico.
  complejoId: string;
  complejoNombre: string;
  complejoComuna: string;
  ownerId: string;
  canchaId: string;
  canchaNombre: string;
  canchaFormato: Formato;

  inicio: FechaFirestore;
  fin: FechaFirestore;

  // CLP, enteros.
  precioTotal: number;
  montoPagado: number;
  // El saldo se paga en el complejo; el sistema no lo cobra.
  saldoPendiente: number;
  tipoPago: TipoPago;
  // 6 % de precioTotal, calculada al confirmar el pago.
  comision: number;

  estado: EstadoReservaGuardado;
  // Solo en pendiente_pago: el bloque queda tomado hasta esta hora (10 minutos).
  expiraAt: FechaFirestore | null;
  // createdAt + 1 h, calculado en el servidor.
  cancelableHasta: FechaFirestore;

  canceladaPor: QuienCancela | null;
  motivoCancelacion: string | null;
  // CLP que el jugador pierde al cancelar fuera de la ventana (30 % de lo pagado). null si no
  // aplica. Es un aviso: los reembolsos no se ejecutan en el sistema.
  penalizacion: number | null;

  tieneResena: boolean;

  // Referencia del pago simulado de Webpay. Sirve para descartar retornos duplicados.
  webpayToken: string | null;
  webpayOrdenCompra: string | null;

  createdAt: FechaFirestore;
  updatedAt: FechaFirestore;
};

export type ReservaConId = Reserva & { id: string };
