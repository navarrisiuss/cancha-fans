// Página de servidor: comprueba la aprobación, consulta los datos públicos con el Admin SDK
// y genera el contenido y los metadatos de la ficha. La reserva se integra como sección aparte.
import "server-only";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Encabezado } from "../../../components/encabezado";
import { SeccionReserva } from "../../../components/reservas/seccion-reserva";
import { dbAdmin } from "../../../lib/firebase/admin";
import type { DatosComplejo } from "../../../lib/firebase/complejos";
import { DIAS_SEMANA, type Cancha, type CanchaConId, type DiaSemana } from "../../../lib/tipos/cancha";
import type { Resena } from "../../../lib/tipos/resena";
import { textoCalificacion } from "../tarjeta-complejo";

const NOMBRES_DIAS: Record<DiaSemana, string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};

// ISR (docs/arquitectura.md): la ficha se genera en la primera visita y se sirve desde caché,
// regenerándose como máximo cada cinco minutos. Así cada visita no vuelve a leer el complejo, sus
// canchas y sus reseñas en Firestore. El precio mostrado puede tener hasta cinco minutos de
// atraso, pero la reserva siempre relee el precio en el servidor, y la disponibilidad (la grilla)
// se pide aparte sin caché. React comparte la lectura del complejo entre la página y sus metadatos.
export const revalidate = 300;

// Sin complejos que prerenderizar en el build: lista vacía para que cada ficha se genere en su
// primera visita y quede en caché (sin Cache Components, [] es válido y significa "todo bajo demanda").
export function generateStaticParams(): { id: string }[] {
  return [];
}

const leerComplejoPublicado = cache(async (id: string) => {
  if (id.includes("/")) notFound();

  const referencia = dbAdmin().collection("complejos").doc(id);
  const documento = await referencia.get();
  const datos = documento.data();
  if (!datos || datos.estado !== "aprobado") notFound();

  return {
    referencia,
    nombre: datos.nombre as DatosComplejo["nombre"],
    descripcion: datos.descripcion as DatosComplejo["descripcion"],
    direccion: datos.direccion as DatosComplejo["direccion"],
    comuna: datos.comuna as DatosComplejo["comuna"],
    fotos: (datos.fotos ?? []) as string[],
    ratingPromedio: (datos.ratingPromedio ?? 0) as number,
    totalResenas: (datos.totalResenas ?? 0) as number,
  };
});

export async function generateMetadata({ params }: PageProps<"/complejos/[id]">): Promise<Metadata> {
  const { id } = await params;
  const complejo = await leerComplejoPublicado(id);
  return {
    title: `${complejo.nombre} en ${complejo.comuna} | CanchaFans`,
    description: complejo.descripcion,
  };
}

export default async function FichaComplejo({ params }: PageProps<"/complejos/[id]">) {
  const { id } = await params;
  const complejo = await leerComplejoPublicado(id);

  // Una lectura por cancha activa y hasta 20 reseñas. La proyección de canchas incluye
  // solo los campos de Cancha para entregar props serializables a la sección de reserva.
  const [resultadoCanchas, resultadoResenas] = await Promise.all([
    complejo.referencia.collection("canchas").where("activa", "==", true)
      .select("nombre", "formato", "superficie", "techada", "precioPorBloque", "duracionBloqueMin", "horarioAtencion", "activa")
      .get(),
    dbAdmin().collection("resenas").where("complejoId", "==", id).limit(20).get(),
  ]);
  const canchas: CanchaConId[] = resultadoCanchas.docs
    .map((documento) => ({ id: documento.id, ...(documento.data() as Cancha) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es-CL", { numeric: true }));
  // Ordenamos la muestra en memoria para evitar un índice compuesto de complejo y fecha.
  const resenas = resultadoResenas.docs
    .map((documento) => ({ id: documento.id, ...(documento.data() as Resena) }))
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-[#F0EEE9] text-[#12241C]">
      <Encabezado />
      <main className="mx-auto max-w-[1240px] px-5 py-12 lg:px-8">
        <Link href="/buscar" className="text-sm font-semibold text-[#0F7A4D] hover:underline">
          Buscar complejos
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-[42px]">{complejo.nombre}</h1>
        <p className="mt-2 text-[#4D5D54]">{complejo.direccion}, {complejo.comuna}</p>
        <p className="mt-2 text-sm font-semibold">{textoCalificacion(complejo.ratingPromedio, complejo.totalResenas)}</p>

        {complejo.fotos.length > 0 && (
          <ul aria-label="Fotos del complejo" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {complejo.fotos.map((foto, indice) => (
              <li key={`${indice}-${foto}`}>
                {/* Las fotos vienen de Storage. next/image requeriría configurar su dominio y usar el optimizador de Vercel. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={foto}
                  alt={`Foto ${indice + 1} de ${complejo.nombre}`}
                  className="aspect-[4/3] w-full rounded-2xl bg-white object-cover"
                />
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 max-w-3xl whitespace-pre-line leading-relaxed text-[#4D5D54]">{complejo.descripcion}</p>

        <div className="mt-8">
          {/* La fecha, la hora y el formato quedan en la URL para la implementación de reservas. */}
          <SeccionReserva complejoId={id} canchas={canchas} />
        </div>

        <section aria-labelledby="canchas" className="mt-10">
          <h2 id="canchas" className="text-2xl font-semibold">Canchas</h2>
          {canchas.length === 0 ? (
            <p className="mt-3 text-[#4D5D54]">Este complejo aún no tiene canchas publicadas.</p>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {canchas.map((cancha) => (
                <li key={cancha.id} className="rounded-[24px] border border-[#DAD7CF] bg-white p-6">
                  <h3 className="text-lg font-semibold">{cancha.nombre} · {cancha.formato}</h3>
                  <p className="mt-1 text-sm text-[#4D5D54]">
                    {cancha.superficie === "sintetico" ? "Pasto sintético" : "Pasto natural"}
                    {" · "}
                    {cancha.techada ? "Techada" : "Al aire libre"}
                  </p>
                  <p className="mt-3 text-sm font-semibold">
                    {cancha.precioPorBloque.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}
                    {" por bloque de "}{cancha.duracionBloqueMin} minutos
                  </p>
                  <h4 className="mt-5 text-sm font-semibold">Horario de atención</h4>
                  <dl className="mt-2 space-y-1 text-sm text-[#4D5D54]">
                    {DIAS_SEMANA.map((dia) => {
                      const horario = cancha.horarioAtencion[dia];
                      return (
                        <div key={dia} className="flex justify-between gap-2">
                          <dt>{NOMBRES_DIAS[dia]}</dt>
                          <dd>{horario ? `${horario.abre} a ${horario.cierra}` : "Cerrada"}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="resenas" className="mt-10">
          <h2 id="resenas" className="text-2xl font-semibold">Reseñas</h2>
          {resenas.length === 0 ? (
            <p className="mt-3 text-[#4D5D54]">Todavía no hay reseñas de este complejo.</p>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {resenas.map((resena) => (
                <li key={resena.id} className="rounded-[24px] border border-[#DAD7CF] bg-white p-6">
                  <p className="font-semibold">{resena.jugadorNombre} · {resena.rating} de 5</p>
                  {resena.comentario && <p className="mt-2 whitespace-pre-line text-sm text-[#4D5D54]">{resena.comentario}</p>}
                  {(resena.equipoNombre || resena.equipoRivalNombre || resena.resultado) && (
                    <dl className="mt-3 space-y-1 text-sm">
                      {resena.equipoNombre && <div><dt className="inline font-semibold">Equipo</dt>{" · "}<dd className="inline">{resena.equipoNombre}</dd></div>}
                      {resena.equipoRivalNombre && <div><dt className="inline font-semibold">Rival</dt>{" · "}<dd className="inline">{resena.equipoRivalNombre}</dd></div>}
                      {resena.resultado && <div><dt className="inline font-semibold">Resultado</dt>{" · "}<dd className="inline">{resena.resultado}</dd></div>}
                    </dl>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
