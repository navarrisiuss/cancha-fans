// Documento bloqueos/{bloqueoId} (ver docs/modelo-datos.md): bloqueo manual del arrendatario por
// mantención, evento privado, lluvia, etc. Se escribe solo desde Route Handlers con el Admin SDK,
// que además rechazan el bloqueo si choca con una reserva activa.
import type { FechaFirestore } from "./fecha";

export type Bloqueo = {
  complejoId: string;
  canchaId: string;
  ownerId: string;
  // Puede cubrir varias horas seguidas, no solo un bloque.
  inicio: FechaFirestore;
  fin: FechaFirestore;
  motivo: string;
  createdAt: FechaFirestore;
};

export type BloqueoConId = Bloqueo & { id: string };
