// Página de servidor: valida los filtros de la URL, consulta con el Admin SDK a través del módulo
// de datos públicos y entrega las tarjetas listas para mostrar.
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Encabezado } from "../../components/encabezado";
import { COMUNAS } from "../../lib/comunas";
import { FORMATOS } from "../../lib/tipos/cancha";
import { esFechaValida, esHoraValida } from "../../lib/zona-horaria";
import { buscarComplejosAprobados } from "../complejos/datos-publicos";
import { TarjetaComplejo } from "../complejos/tarjeta-complejo";
import { MAXIMO_CARACTERES_BUSQUEDA, normalizarNombre } from "./nombre-complejo";

const TOPE_BUSQUEDA_POR_NOMBRE = 50;

export const metadata: Metadata = {
  title: "Buscar canchas de fútbol | CanchaFans",
  description: "Encuentra complejos de fútbol por nombre, comuna y formato.",
};

export default async function Buscar({ searchParams }: PageProps<"/buscar">) {
  const parametros = await searchParams;
  const comuna = COMUNAS.find((comuna) => comuna === parametros.comuna) ?? null;
  const formato = FORMATOS.find((formato) => formato === parametros.formato);
  const nombreBuscado = typeof parametros.q === "string"
    ? parametros.q.trim().slice(0, MAXIMO_CARACTERES_BUSQUEDA).trimEnd()
    : "";
  const orden = parametros.orden === "puntuacion" ? "puntuacion" : "recientes";
  const fecha = typeof parametros.fecha === "string" && esFechaValida(parametros.fecha)
    ? parametros.fecha
    : undefined;
  const hora = typeof parametros.hora === "string" && esHoraValida(parametros.hora)
    ? parametros.hora
    : undefined;
  const preferencias = {
    ...(fecha ? { fecha } : {}),
    ...(hora ? { hora } : {}),
    ...(formato ? { formato } : {}),
  };
  const tope = !comuna && nombreBuscado ? TOPE_BUSQUEDA_POR_NOMBRE : undefined;
  const aprobados = await buscarComplejosAprobados(comuna, tope);
  const nombreNormalizado = normalizarNombre(nombreBuscado);
  const complejos = aprobados.filter((complejo) =>
    (!formato || complejo.formatosDisponibles.includes(formato)) &&
    (!nombreNormalizado || normalizarNombre(complejo.nombre).includes(nombreNormalizado)),
  );
  if (orden === "puntuacion") {
    complejos.sort((primero, segundo) =>
      segundo.ratingPromedio - primero.ratingPromedio ||
      segundo.totalResenas - primero.totalResenas ||
      primero.nombre.localeCompare(segundo.nombre, "es-CL"),
    );
  }

  return (
    <div className="min-h-screen bg-[#F0EEE9] text-[#12241C]">
      <Encabezado />
      <main className="mx-auto max-w-[1240px] px-5 py-12 lg:px-8">
        <Link href="/#buscar" className="text-sm font-semibold text-[#0F7A4D] hover:underline">
          Cambiar búsqueda
        </Link>
        <h1 className="mt-4 wrap-break-word text-3xl font-semibold tracking-[-0.035em] sm:text-[42px]">
          {comuna ? `Complejos en ${comuna}` : "Complejos de fútbol"}
          {nombreBuscado && ` · «${nombreBuscado}»`}
        </h1>
        <p className="mt-2 text-[#4D5D54]">Consulta los horarios en la ficha de cada complejo.</p>
        <section aria-labelledby="resultados" className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2 id="resultados" className="min-w-0 wrap-break-word font-semibold">
              {complejos.length === 1 ? "1 complejo encontrado" : `${complejos.length} complejos encontrados`}
              {nombreBuscado && ` para «${nombreBuscado}»`}
              {formato && ` · ${formato}`}
            </h2>
            {/* El formulario GET envía el orden y los filtros por URL. La página de servidor
                renderiza el resultado con esos parámetros, sin estado ni eventos propios del selector. */}
            <Form action="/buscar" className="flex flex-wrap items-center gap-2 text-sm">
              {nombreBuscado && <input type="hidden" name="q" value={nombreBuscado} />}
              {comuna && <input type="hidden" name="comuna" value={comuna} />}
              {fecha && <input type="hidden" name="fecha" value={fecha} />}
              {hora && <input type="hidden" name="hora" value={hora} />}
              {formato && <input type="hidden" name="formato" value={formato} />}
              <label htmlFor="orden" className="font-semibold">Ordenar por:</label>
              <select
                key={orden}
                id="orden"
                name="orden"
                defaultValue={orden}
                className="rounded-xl border border-[#DAD7CF] bg-white px-3 py-2"
              >
                <option value="recientes">Más recientes</option>
                <option value="puntuacion">Mejor puntuación</option>
              </select>
              <button type="submit" className="rounded-xl bg-[#0F7A4D] px-4 py-2 font-semibold text-white hover:bg-[#0B6840]">
                Aplicar
              </button>
            </Form>
          </div>
          {complejos.length === 0 ? (
            <div className="rounded-[24px] border border-[#DAD7CF] bg-white p-8">
              <p>
                No encontramos complejos para esta búsqueda.{" "}
                {nombreBuscado ? "Prueba con otro nombre o cambia la comuna o el formato." : "Prueba con otra comuna o formato."}
              </p>
              <Link href="/#buscar" className="mt-3 inline-block text-sm font-semibold text-[#0F7A4D] hover:underline">
                Volver a buscar
              </Link>
            </div>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {complejos.map((complejo) => (
                <li key={complejo.id}>
                  <TarjetaComplejo complejo={complejo} preferencias={preferencias} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
