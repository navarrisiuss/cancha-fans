import "server-only";

import type { QueryDocumentSnapshot, Timestamp } from "firebase-admin/firestore";
import { unstable_cache } from "next/cache";
import type { Comuna } from "../../lib/comunas";
import { dbAdmin } from "../../lib/firebase/admin";
import type { ResumenPublicoComplejo } from "./tarjeta-complejo";

function resumirComplejo(documento: QueryDocumentSnapshot): ResumenPublicoComplejo {
  const datos = documento.data();
  return {
    id: documento.id,
    nombre: datos.nombre,
    comuna: datos.comuna,
    foto: datos.fotos?.[0] ?? null,
    formatosDisponibles: datos.formatosDisponibles ?? [],
    ratingPromedio: datos.ratingPromedio ?? 0,
    totalResenas: datos.totalResenas ?? 0,
  };
}

function complejosAprobados() {
  return dbAdmin().collection("complejos").where("estado", "==", "aprobado");
}

const TOPE_LISTADO_GENERAL = 24;

// La caché usa la comuna y el tope de los argumentos como parte de la clave por cinco minutos.
// Con comuna se leen los aprobados de esa comuna. Sin comuna se leen hasta 24 o 50 documentos.
export const buscarComplejosAprobados = unstable_cache(
  async (comuna: Comuna | null, tope = TOPE_LISTADO_GENERAL) => {
    const aprobados = complejosAprobados();
    const consulta = comuna
      ? aprobados.where("comuna", "==", comuna)
      : aprobados.limit(tope);
    const { docs } = await consulta.get();
    return docs.map(resumirComplejo);
  },
  ["busqueda-complejos-aprobados"],
  { revalidate: 300 },
);

export async function listarComplejosDestacados() {
  // Hasta 24 lecturas por regeneración. Se ordena esta muestra por fecha de creación
  // para evitar el índice compuesto de estado y fecha.
  const { docs } = await complejosAprobados().limit(TOPE_LISTADO_GENERAL).get();
  return docs
    .map((documento) => ({
      documento,
      creado: (documento.get("createdAt") as Timestamp | undefined)?.toMillis() ?? 0,
    }))
    .sort((a, b) => b.creado - a.creado)
    .slice(0, 6)
    .map(({ documento }) => resumirComplejo(documento));
}
