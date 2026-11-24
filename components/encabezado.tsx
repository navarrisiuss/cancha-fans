"use client";

// Encabezado común de las páginas con sesión (ficha, checkout, Mis reservas, panel del
// arrendatario...). Va en cliente porque depende de la sesión de Firebase Auth, que vive en el
// navegador. La landing y /admin tienen su propio encabezado.
//
// Es un archivo compartido: lo edita solo quien mantiene la base, para que ninguna rama choque con
// otra por tocar la navegación. Las ramas solo lo importan.
import Link from "next/link";
import { signOut } from "firebase/auth";
import { Logo } from "../app/componentes-ui";
import { auth } from "../lib/firebase/client";
import { useSesion } from "../lib/firebase/use-sesion";
import { Campanita } from "./notificaciones/campanita";

const enlace = "text-sm font-semibold text-[#12241C] transition-opacity hover:opacity-70";

export function Encabezado() {
  const { usuario, cargando } = useSesion();
  // Primer nombre para el saludo; si la cuenta no tiene nombre, se usa el correo.
  const nombre = usuario?.displayName?.trim().split(/\s+/)[0] || usuario?.email || "";

  return (
    <header className="border-b border-[#E7E5DF] bg-white">
      <div className="mx-auto flex min-h-[68px] max-w-[1240px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-2 lg:px-8">
        <Link href="/" aria-label="CanchaFans, inicio">
          <Logo />
        </Link>

        {/* Mientras Firebase confirma la sesión no se muestra nada, para no parpadear entre
            "Iniciar sesión" y "Cerrar sesión". */}
        {!cargando && usuario && (
          <nav className="flex items-center gap-5">
            <Link href="/mis-reservas" className={enlace}>
              Mis reservas
            </Link>
            <Link href="/arrendatario/complejos" className={enlace}>
              Mis complejos
            </Link>
            <Campanita />
            <span className="hidden text-sm font-medium text-[#627067] md:inline">Hola, {nombre}</span>
            <button type="button" onClick={() => void signOut(auth)} className={enlace}>
              Cerrar sesión
            </button>
          </nav>
        )}
        {!cargando && !usuario && (
          <nav className="flex items-center gap-5">
            <Link href="/iniciar-sesion" className={enlace}>
              Iniciar sesión
            </Link>
            <Link
              href="/crear-cuenta"
              className="rounded-xl bg-[#0F7A4D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0B6840]"
            >
              Crear cuenta
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
