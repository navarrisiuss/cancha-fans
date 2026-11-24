// Página de servidor: lee los destacados con el Admin SDK y entrega solo datos públicos
// serializables al componente que maneja la sesión y el formulario.
import "server-only";

import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "./componentes-ui";
import { InicioInteractivo } from "./inicio-cliente";
import { PORCENTAJE_SENA } from "../lib/reglas";
import { hoyEnSantiago } from "../lib/zona-horaria";
import { listarComplejosDestacados } from "./complejos/datos-publicos";

export const metadata: Metadata = {
  title: "CanchaFans — Reserva canchas de fútbol en Chile",
  description: "Busca canchas F5, F7 y F11 por comuna o nombre del complejo, reserva tu horario y paga en línea.",
};

// ISR conserva la página estática entre visitas y vuelve a consultar Firestore
// al regenerarla bajo demanda, como máximo una vez cada cinco minutos.
export const revalidate = 300;

export default async function Inicio() {
  const destacados = await listarComplejosDestacados();
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F0EEE9] text-[#12241C]">
      <main>
        <InicioInteractivo destacados={destacados} fechaInicial={hoyEnSantiago()} />

        <section id="funciona" className="bg-white py-24">
          <div className="mx-auto max-w-[1240px] px-5 lg:px-8">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0F7A4D]">Así de simple</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-[42px]">De la búsqueda a la cancha.</h2>
            </div>
            <div className="mt-12 grid gap-px overflow-hidden rounded-[24px] border border-[#E7E5DF] bg-[#E7E5DF] md:grid-cols-3">
              {[
                ["01", "Busca tu cancha", "Busca por comuna o nombre del complejo y elige fecha, hora y formato."],
                ["02", "Asegura el horario", `Reserva pagando el total o una seña del ${PORCENTAJE_SENA}% en un checkout seguro.`],
                ["03", "Llega y juega", "Recibe tu comprobante digital y revisa todos los detalles desde tu cuenta."],
              ].map(([numero, titulo, texto]) => (
                <div key={numero} className="bg-white p-8 lg:p-10">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-[#12241C] text-xs font-semibold text-white">{numero}</span>
                  <h3 className="mt-8 text-xl font-semibold">{titulo}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#627067]">{texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="arrendatarios" className="mx-auto max-w-[1240px] px-5 py-24 lg:px-8">
          <div className="relative overflow-hidden rounded-[30px] bg-[#0F7A4D] px-7 py-14 text-white sm:px-12 lg:px-16 lg:py-16">
            <div className="field-lines absolute inset-0 opacity-25" />
            <div className="relative max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Para arrendatarios</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">Más reservas. Menos mensajes.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/75">
                Publica tus canchas, controla bloqueos y recibe reservas confirmadas desde un solo lugar.
              </p>
              <Link
                href="/arrendatario/postular"
                className="mt-8 inline-block rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[#0F7A4D]"
              >
                Quiero publicar mi complejo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#12241C] text-white">
        <div className="mx-auto flex max-w-[1240px] flex-col justify-between gap-8 px-5 py-12 sm:flex-row lg:px-8">
          <div>
            <Link href="/" aria-label="CanchaFans, inicio">
              <Logo claro />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/55">La forma simple y segura de reservar canchas de fútbol en Chile.</p>
          </div>
          <div className="grid grid-cols-2 gap-12 text-sm">
            <div className="flex flex-col gap-3">
              <span className="font-semibold">CanchaFans</span>
              <a className="text-white/60" href="#funciona">
                Cómo funciona
              </a>
              <a className="text-white/60" href="#arrendatarios">
                Publica tu cancha
              </a>
            </div>
            <div className="flex flex-col gap-3">
              <span className="font-semibold">Soporte</span>
              {/* Las páginas de contenido las crea la rama feat/admin-listados-metricas-contenido; las
                  rutas quedan fijadas acá para que esa rama no tenga que tocar la landing. */}
              <Link className="text-white/60" href="/ayuda">
                Centro de ayuda
              </Link>
              <Link className="text-white/60" href="/reglas-de-cancelacion">
                Reglas de cancelación
              </Link>
              <Link className="text-white/60" href="/terminos">
                Términos y condiciones
              </Link>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-[1240px] border-t border-white/10 px-5 py-6 text-xs text-white/40 lg:px-8">
          © 2026 CanchaFans. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
