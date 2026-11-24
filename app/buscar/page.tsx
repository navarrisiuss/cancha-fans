// Página de servidor: valida los filtros de la URL, consulta con el Admin SDK a través del módulo
// de datos públicos y entrega las tarjetas listas para mostrar.
import type { Metadata } from "next";
import Link from "next/link";
import { Encabezado } from "../../components/encabezado";
import { COMUNAS } from "../../lib/comunas";
import { FORMATOS } from "../../lib/tipos/cancha";
import { esFechaValida, esHoraValida } from "../../lib/zona-horaria";
import { buscarComplejosAprobados } from "../complejos/datos-publicos";
import { TarjetaComplejo } from "../complejos/tarjeta-complejo";

export const metadata: Metadata = {
  title: "Buscar canchas de fútbol | CanchaFans",
  description: "Encuentra complejos de fútbol por comuna y formato.",
};

export default async function Buscar({ searchParams }: PageProps<"/buscar">) {
  const parametros = await searchParams;
  const comuna = COMUNAS.find((comuna) => comuna === parametros.comuna) ?? null;
  const formato = FORMATOS.find((formato) => formato === parametros.formato);
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
  const aprobados = await buscarComplejosAprobados(comuna);
  const complejos = formato
    ? aprobados.filter((complejo) => complejo.formatosDisponibles.includes(formato))
    : aprobados;

  return (
    <div className="min-h-screen bg-[#F0EEE9] text-[#12241C]">
      <Encabezado />
      <main className="mx-auto max-w-[1240px] px-5 py-12 lg:px-8">
        <Link href="/#buscar" className="text-sm font-semibold text-[#0F7A4D] hover:underline">
          Cambiar búsqueda
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-[42px]">
          {comuna ? `Complejos en ${comuna}` : "Complejos de fútbol"}
        </h1>
        <p className="mt-2 text-[#4D5D54]">Consulta los horarios en la ficha de cada complejo.</p>
        <section aria-labelledby="resultados" className="mt-8">
          <h2 id="resultados" className="mb-4 font-semibold">
            {complejos.length === 1 ? "1 complejo encontrado" : `${complejos.length} complejos encontrados`}
            {formato && ` · ${formato}`}
          </h2>
          {complejos.length === 0 ? (
            <div className="rounded-[24px] border border-[#DAD7CF] bg-white p-8">
              <p>No encontramos complejos para esta búsqueda. Prueba con otra comuna o formato.</p>
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
