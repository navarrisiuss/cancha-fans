"use client";

// Componente cliente: usa la sesión de Firebase, controla el menú y actualiza
// la fecha del formulario cuando se hidrata una versión estática de la landing.
import Form from "next/form";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase/client";
import { useSesion } from "../lib/firebase/use-sesion";
import { Campanita } from "../components/notificaciones/campanita";
import { Icono, Logo } from "./componentes-ui";
import { COMUNAS_POR_REGION, REGIONES } from "../lib/comunas";
import { FORMATOS } from "../lib/tipos/cancha";
import { hoyEnSantiago } from "../lib/zona-horaria";
import { MAXIMO_CARACTERES_BUSQUEDA } from "./buscar/nombre-complejo";
import { TarjetaComplejo, type ResumenPublicoComplejo } from "./complejos/tarjeta-complejo";

const fotoHero = "https://images.unsplash.com/photo-1740024023028-1efcfa9bb8de?auto=format&fit=crop&w=1200&q=85";

export function InicioInteractivo({
  destacados,
  fechaInicial,
}: {
  destacados: ResumenPublicoComplejo[];
  fechaInicial: string;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const campoFecha = useRef<HTMLInputElement>(null);
  const { usuario, cargando } = useSesion();
  // Primer nombre para el saludo; si la cuenta no tiene nombre, se usa el correo.
  const nombreSaludo = usuario?.displayName?.trim().split(/\s+/)[0] || usuario?.email || "";

  useEffect(() => {
    const campo = campoFecha.current;
    if (!campo) return;
    const hoy = hoyEnSantiago();
    const conservaValorInicial = campo.value === campo.defaultValue;
    campo.min = hoy;
    campo.defaultValue = hoy;
    if (conservaValorInicial) campo.value = hoy;
  }, [fechaInicial]);

  // signOut borra la sesión guardada en el navegador; useSesion se entera solo y el header vuelve
  // a mostrar "Iniciar sesión".
  const cerrarSesion = () => {
    setMenuAbierto(false);
    void signOut(auth);
  };

  return (
    <>
      <header className="absolute inset-x-0 top-0 z-30 border-b border-white/15 text-white">
        <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
          <Link href="/" aria-label="CanchaFans, inicio">
            <Logo claro />
          </Link>
          {/* Mientras Firebase confirma la sesión no se muestra nada, para no parpadear entre
              "Iniciar sesión" y "Cerrar sesión". */}
          {!cargando && usuario && (
            <div className="hidden items-center gap-3 md:flex">
              <span className="px-2 text-sm font-semibold text-white/80">Hola, {nombreSaludo}</span>
              <Link href="/mis-reservas" className="px-2 text-sm font-semibold text-white transition-opacity hover:opacity-70">
                Mis reservas
              </Link>
              <Link href="/arrendatario/complejos" className="px-2 text-sm font-semibold text-white transition-opacity hover:opacity-70">
                Mis complejos
              </Link>
              <Campanita claro />
              <button
                type="button"
                onClick={cerrarSesion}
                className="rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Cerrar sesión
              </button>
            </div>
          )}
          {!cargando && !usuario && (
            <div className="hidden items-center gap-3 md:flex">
              <Link href="/iniciar-sesion" className="px-2 text-sm font-semibold text-white transition-opacity hover:opacity-70">
                Iniciar sesión
              </Link>
              <Link
                href="/crear-cuenta"
                className="rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Crear cuenta
              </Link>
            </div>
          )}
          <button
            aria-label="Abrir menú"
            className="rounded-full border border-white/30 p-2.5 md:hidden"
            onClick={() => setMenuAbierto(!menuAbierto)}
          >
            <Icono nombre={menuAbierto ? "close" : "menu"} />
          </button>
        </div>
        {menuAbierto && (
          <div className="border-t border-white/15 bg-[#12241C] px-5 py-5 md:hidden">
            <nav className="flex flex-col gap-4 text-sm font-semibold">
              {!cargando && usuario && (
                <>
                  <span className="text-white/80">Hola, {nombreSaludo}</span>
                  <Link href="/mis-reservas" onClick={() => setMenuAbierto(false)}>
                    Mis reservas
                  </Link>
                  <Link href="/arrendatario/complejos" onClick={() => setMenuAbierto(false)}>
                    Mis complejos
                  </Link>
                  <button
                    type="button"
                    onClick={cerrarSesion}
                    className="rounded-xl border border-white/30 py-3 text-center"
                  >
                    Cerrar sesión
                  </button>
                </>
              )}
              {!cargando && !usuario && (
                <>
                  <Link href="/iniciar-sesion" onClick={() => setMenuAbierto(false)}>
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/crear-cuenta"
                    onClick={() => setMenuAbierto(false)}
                    className="rounded-xl border border-white/30 py-3 text-center"
                  >
                    Crear cuenta
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      <section className="relative min-h-[720px] bg-[#12241C]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="absolute inset-0 h-full w-full object-cover object-center opacity-55"
          src={fotoHero}
          alt="Cancha de fútbol iluminada vista desde el aire"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative mx-auto flex min-h-[720px] max-w-[1240px] flex-col justify-center px-5 pb-24 pt-32 lg:px-8">
          <div className="max-w-[760px]">
            <h1 className="text-balance text-[48px] font-semibold leading-[0.98] tracking-[-0.045em] text-white sm:text-[64px] lg:text-[78px]">
              Tu próxima cancha está más cerca.
            </h1>
            <p className="mt-6 max-w-[570px] text-lg font-medium leading-relaxed text-white/80 sm:text-xl">
              Encuentra horarios disponibles, reserva de forma segura y preocúpate solo de armar el equipo.
            </p>
          </div>

          <Form action="/buscar" id="buscar" className="mt-10 scroll-mt-8 rounded-[24px] bg-white p-3 shadow-[0_24px_70px_rgba(18,36,28,0.18)] lg:p-4 xl:absolute xl:-bottom-12 xl:left-8 xl:right-8 xl:mt-0">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1.5fr_1.3fr_1.25fr_1fr_.85fr_auto]">
              <label className="flex min-h-[76px] cursor-text items-center gap-3 rounded-2xl px-4 transition-colors hover:bg-[#F0EEE9]/70 xl:px-3">
                <Icono nombre="search" className="h-5 w-5 shrink-0 text-[#0F7A4D]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#627067]">Complejo</span>
                  <input
                    name="q"
                    type="text"
                    maxLength={MAXIMO_CARACTERES_BUSQUEDA}
                    placeholder="Ej. Los Leones"
                    className="mt-1 w-full bg-transparent text-sm font-semibold placeholder:font-medium"
                  />
                </span>
              </label>
              <label className="group flex min-h-[76px] cursor-pointer items-center gap-3 rounded-2xl px-4 transition-colors hover:bg-[#F0EEE9]/70">
                <Icono nombre="pin" className="h-5 w-5 shrink-0 text-[#0F7A4D]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#627067]">Comuna</span>
                  <select
                    name="comuna"
                    className="mt-1 w-full appearance-none bg-transparent text-sm font-semibold outline-none"
                  >
                    <option value="">Todas las comunas</option>
                    {REGIONES.map((region) => (
                      <optgroup key={region} label={region}>
                        {COMUNAS_POR_REGION[region].map((comuna) => <option key={comuna}>{comuna}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </span>
                <Icono nombre="chevron" className="h-4 w-4 rotate-90" />
              </label>
              <label className="flex min-h-[76px] cursor-pointer items-center gap-3 rounded-2xl px-4 transition-colors hover:bg-[#F0EEE9]/70 xl:px-3">
                <Icono nombre="calendar" className="h-5 w-5 shrink-0 text-[#0F7A4D]" />
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#627067]">Fecha</span>
                  <input
                    ref={campoFecha}
                    name="fecha"
                    type="date"
                    min={fechaInicial}
                    defaultValue={fechaInicial}
                    className="mt-1 w-full bg-transparent text-sm font-semibold outline-none"
                  />
                </span>
              </label>
              <label className="flex min-h-[76px] cursor-pointer items-center gap-3 rounded-2xl px-4 transition-colors hover:bg-[#F0EEE9]/70">
                <Icono nombre="clock" className="h-5 w-5 shrink-0 text-[#0F7A4D]" />
                <span>
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#627067]">Desde</span>
                  <input className="mt-1 w-full bg-transparent text-sm font-semibold outline-none" name="hora" type="time" defaultValue="19:00" />
                </span>
              </label>
              <label className="flex min-h-[76px] cursor-pointer items-center gap-3 rounded-2xl px-4 transition-colors hover:bg-[#F0EEE9]/70">
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#627067]">Formato</span>
                  <select
                    name="formato"
                    className="mt-1 w-full appearance-none bg-transparent text-sm font-semibold outline-none"
                  >
                    <option value="">Todos</option>
                    {FORMATOS.map((formato) => <option key={formato}>{formato}</option>)}
                  </select>
                </span>
                <Icono nombre="chevron" className="h-4 w-4 rotate-90" />
              </label>
              <button
                type="submit"
                className="flex min-h-[76px] items-center justify-center gap-2 rounded-2xl bg-[#0F7A4D] px-7 text-sm font-semibold text-white transition-colors hover:bg-[#0B6840]"
              >
                <Icono nombre="search" className="h-5 w-5" />
                Buscar
              </button>
            </div>
          </Form>
        </div>
      </section>

      <section id="complejos" className="mx-auto max-w-[1240px] px-5 pb-24 pt-16 lg:px-8 xl:pt-28">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0F7A4D]">Juega esta semana</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-[42px]">Canchas destacadas</h2>
        </div>

        {destacados.length === 0 ? (
          <div className="mt-10 rounded-[24px] border border-[#DAD7CF] bg-white p-12 text-center">
            <h3 className="text-xl font-semibold">Todavía no hay complejos publicados</h3>
            <p className="mt-2 text-sm text-[#627067]">
              En cuanto un arrendatario publique su complejo y el admin lo apruebe, va a aparecer acá.
            </p>
          </div>
        ) : (
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {destacados.map((complejo) => (
              <li key={complejo.id}><TarjetaComplejo complejo={complejo} /></li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
