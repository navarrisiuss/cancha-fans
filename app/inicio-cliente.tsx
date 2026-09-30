"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icono, Logo } from "./componentes-ui";

const fotoHero = "https://images.unsplash.com/photo-1740024023028-1efcfa9bb8de?auto=format&fit=crop&w=1200&q=85";

export function InicioInteractivo() {
  const [comuna, setComuna] = useState("Todas las comunas");
  const [formato, setFormato] = useState("Todos");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const hoy = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const irAlListado = () => document.getElementById("complejos")?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      <header className="absolute inset-x-0 top-0 z-30 border-b border-white/15 text-white">
        <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
          <Link href="/" aria-label="CanchaFans, inicio">
            <Logo claro />
          </Link>
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
            </nav>
          </div>
        )}
      </header>

      <section className="relative min-h-[720px] bg-[#12241C]">
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

          <div className="absolute -bottom-[98px] left-5 right-5 rounded-[24px] bg-white p-3 shadow-[0_24px_70px_rgba(18,36,28,0.18)] lg:left-8 lg:right-8 lg:p-4">
            <div className="grid gap-2 lg:grid-cols-[1.25fr_1fr_1fr_.8fr_auto]">
              <label className="group flex min-h-[76px] cursor-pointer items-center gap-3 rounded-2xl px-4 transition-colors hover:bg-[#F0EEE9]/70">
                <Icono nombre="pin" className="h-5 w-5 shrink-0 text-[#0F7A4D]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#627067]">Comuna</span>
                  <select
                    value={comuna}
                    onChange={(e) => setComuna(e.target.value)}
                    className="mt-1 w-full appearance-none bg-transparent text-sm font-semibold outline-none"
                  >
                    <option>Todas las comunas</option>
                  </select>
                </span>
                <Icono nombre="chevron" className="h-4 w-4 rotate-90" />
              </label>
              <label className="flex min-h-[76px] cursor-pointer items-center gap-3 rounded-2xl px-4 transition-colors hover:bg-[#F0EEE9]/70">
                <Icono nombre="calendar" className="h-5 w-5 shrink-0 text-[#0F7A4D]" />
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#627067]">Fecha</span>
                  <input className="mt-1 w-full bg-transparent text-sm font-semibold outline-none" type="date" min={hoy} defaultValue={hoy} />
                </span>
              </label>
              <label className="flex min-h-[76px] cursor-pointer items-center gap-3 rounded-2xl px-4 transition-colors hover:bg-[#F0EEE9]/70">
                <Icono nombre="clock" className="h-5 w-5 shrink-0 text-[#0F7A4D]" />
                <span>
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#627067]">Desde</span>
                  <input className="mt-1 w-full bg-transparent text-sm font-semibold outline-none" type="time" defaultValue="19:00" />
                </span>
              </label>
              <label className="flex min-h-[76px] cursor-pointer items-center gap-3 rounded-2xl px-4 transition-colors hover:bg-[#F0EEE9]/70">
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#627067]">Formato</span>
                  <select
                    value={formato}
                    onChange={(e) => setFormato(e.target.value)}
                    className="mt-1 w-full appearance-none bg-transparent text-sm font-semibold outline-none"
                  >
                    <option>Todos</option>
                    <option>F5</option>
                    <option>F7</option>
                    <option>F11</option>
                  </select>
                </span>
                <Icono nombre="chevron" className="h-4 w-4 rotate-90" />
              </label>
              <button
                onClick={irAlListado}
                className="flex min-h-[76px] items-center justify-center gap-2 rounded-2xl bg-[#0F7A4D] px-7 text-sm font-semibold text-white transition-colors hover:bg-[#0B6840]"
              >
                <Icono nombre="search" className="h-5 w-5" />
                Buscar
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="complejos" className="mx-auto max-w-[1240px] px-5 pb-24 pt-44 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0F7A4D]">Juega esta semana</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-[42px]">Canchas destacadas</h2>
          <p className="mt-2 text-[#627067]">Complejos aprobados con horarios para reservar.</p>
        </div>

        <div className="mt-10 rounded-[24px] border border-[#DAD7CF] bg-white p-12 text-center">
          <h3 className="text-xl font-semibold">Todavía no hay complejos publicados</h3>
          <p className="mt-2 text-sm text-[#627067]">
            En cuanto un arrendatario publique su complejo y el admin lo apruebe, va a aparecer acá.
          </p>
        </div>
      </section>
    </>
  );
}
