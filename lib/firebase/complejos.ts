// Documento complejos/{complejoId} de Firestore (ver docs/modelo-datos.md).
// Los tipos se importan con `import type` desde el servidor (se borran al compilar); la función
// crearComplejo usa el SDK cliente y solo corre en el navegador.
import "client-only";

import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./client";
import type { Comuna, Region } from "../comunas";

// Límites de las fotos. Los mismos valores están en storage.rules y firestore.rules.
export const MAX_FOTOS = 5;
export const MAX_BYTES_FOTO = 5 * 1024 * 1024;
export const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];

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
};

// Datos sensibles: van en complejos/{id}/privado/datos, no en el documento del complejo. Las
// security rules protegen documentos completos, no campos; si estuvieran junto al nombre, serían
// públicos cuando el complejo se aprueba. Solo los leen el dueño y el admin.
export type DatosLegales = {
  rut: string;
  razonSocial: string;
  datosBancarios: string;
};

// Crea la postulación directo en "en_revision" (no hay borradores). formatosDisponibles nace vacío:
// se llena cuando el arrendatario agregue canchas. Primero se suben las fotos y después se escriben
// los dos documentos en un batch: o se crean ambos o ninguno. Cuesta 2 escrituras de Firestore.
// ponytail: si falla después de subir las fotos quedan archivos huérfanos en Storage; limpiarlos
// con un job solo si molesta (el proyecto no tiene cron).
export async function crearComplejo(
  ownerId: string,
  datos: DatosComplejo,
  legales: DatosLegales,
  fotos: File[],
) {
  const complejo = doc(collection(db, "complejos"));

  // El id del complejo se conoce antes de escribirlo, así las fotos quedan en su carpeta.
  const urls = await Promise.all(
    fotos.map(async (foto, i) => {
      const archivo = ref(storage, `complejos/${ownerId}/${complejo.id}/${i}`);
      await uploadBytes(archivo, foto, { contentType: foto.type });
      return getDownloadURL(archivo);
    }),
  );

  const batch = writeBatch(db);
  batch.set(complejo, {
    ...datos,
    ownerId,
    fotos: urls,
    estado: "en_revision" satisfies EstadoComplejo,
    formatosDisponibles: [] as Formato[],
    ratingPromedio: 0,
    totalResenas: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(complejo, "privado", "datos"), { ...legales, ownerId });
  await batch.commit();
  return complejo.id;
}
