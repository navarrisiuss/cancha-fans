// Documento complejos/{complejoId} de Firestore (ver docs/modelo-datos.md).
// Los tipos se importan con `import type` desde el servidor (se borran al compilar); la función
// crearComplejo usa el SDK cliente y solo corre en el navegador.
import "client-only";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./client";
import type { Comuna, Region } from "../comunas";

export type EstadoComplejo = "borrador" | "en_revision" | "aprobado" | "rechazado";

export type Formato = "F5" | "F7" | "F11";

// Datos que escribe el arrendatario al postular. El resto de los campos del modelo (estado,
// notaAdmin, rating, fechas) los pone el sistema o el admin, no el formulario.
export type DatosComplejo = {
  nombre: string;
  descripcion: string;
  region: Region;
  comuna: Comuna;
  direccion: string;
  rut: string;
  razonSocial: string;
  datosBancarios: string;
};

// Crea la postulación directo en "en_revision" (no hay borradores). formatosDisponibles nace vacío:
// se llena cuando el arrendatario agregue canchas. Cuesta 1 escritura.
export async function crearComplejo(ownerId: string, datos: DatosComplejo) {
  const referencia = await addDoc(collection(db, "complejos"), {
    ...datos,
    ownerId,
    fotos: [],
    estado: "en_revision" satisfies EstadoComplejo,
    formatosDisponibles: [] as Formato[],
    ratingPromedio: 0,
    totalResenas: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return referencia.id;
}
