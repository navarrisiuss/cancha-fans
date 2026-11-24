// Documento resenas/{reservaId} (ver docs/modelo-datos.md). El ID del documento ES el ID de la
// reserva: una reseña por reserva, sin consultar si ya existe. Se crea solo desde un Route Handler
// con el Admin SDK, porque en la misma transacción actualiza ratingPromedio y totalResenas del
// complejo, y esos campos no se pueden escribir desde el cliente.
import type { FechaFirestore } from "./fecha";

export type Resena = {
  complejoId: string;
  canchaId: string;
  jugadorId: string;
  jugadorNombre: string;
  // Entero de 1 a 5.
  rating: number;
  comentario: string;
  // Texto libre y opcional, sin entidad "equipo" detrás (ej. "Los Tigres", "Halcones FC", "3-2").
  equipoNombre: string;
  equipoRivalNombre: string;
  resultado: string;
  reportada: boolean;
  createdAt: FechaFirestore;
};

export type ResenaConId = Resena & { id: string };
