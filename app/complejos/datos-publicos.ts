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

// Ordena en memoria los documentos ya leídos de más reciente a más antiguo sin exigir
// índices compuestos en Firestore; los complejos antiguos sin createdAt quedan al final.
function ordenarPorCreacionDescendente(documentos: QueryDocumentSnapshot[]) {
  return documentos
    .map((documento) => {
      const fechaCreacion = documento.get("createdAt") as Timestamp | null | undefined;
      return {
        documento,
        creadoMs: typeof fechaCreacion?.toMillis === "function" ? fechaCreacion.toMillis() : null,
      };
    })
    .sort((primero, segundo) => {
      if (primero.creadoMs === segundo.creadoMs) return 0;
      if (primero.creadoMs === null) return 1;
      if (segundo.creadoMs === null) return -1;
      return segundo.creadoMs - primero.creadoMs;
    })
    .map(({ documento }) => documento);
}

function complejosAprobados() {
  return dbAdmin().collection("complejos").where("estado", "==", "aprobado");
}

const TOPE_LISTADO_GENERAL = 24;

// La caché usa la comuna y el tope de los argumentos como parte de la clave por cinco minutos.
// Con comuna se leen los aprobados de esa comuna. Sin comuna se leen hasta 24 o 50 documentos.
// Entrega los resultados ordenados por fecha de creación descendente para «Más recientes».
export const buscarComplejosAprobados = unstable_cache(
  async (comuna: Comuna | null, tope = TOPE_LISTADO_GENERAL) => {
    const aprobados = complejosAprobados();
    const consulta = comuna
      ? aprobados.where("comuna", "==", comuna)
      : aprobados.limit(tope);
    const { docs } = await consulta.get();
    return ordenarPorCreacionDescendente(docs).map(resumirComplejo);
  },
  ["busqueda-complejos-aprobados"],
  { revalidate: 300 },
);

export async function listarComplejosDestacados() {
  // Hasta 24 lecturas por regeneración. Se ordena esta muestra por fecha de creación
  // para evitar el índice compuesto de estado y fecha.
  const { docs } = await complejosAprobados().limit(TOPE_LISTADO_GENERAL).get();
  return ordenarPorCreacionDescendente(docs)
    .slice(0, 6)
    .map(resumirComplejo);
}
