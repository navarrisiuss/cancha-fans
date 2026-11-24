// Página 404 de servidor (SSG): no necesita estado ni sesión, solo presenta un aviso claro en
// español de Chile cuando la ruta solicitada no existe y ofrece volver al inicio.
import Link from "next/link";
import { Logo } from "./componentes-ui";

export default function PaginaNoEncontrada() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F0EEE9] px-5 py-12 text-[#12241C]">
      <Link href="/" aria-label="CanchaFans, inicio" className="mb-8">
        <Logo />
      </Link>
      <div className="w-full max-w-[460px] rounded-[24px] bg-white p-8 text-center shadow-[0_8px_30px_rgba(18,36,28,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0F7A4D]">
          Error 404
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#12241C]">
          Esta página salió de la cancha
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-[#627067]">
          La dirección que buscas no existe o fue movida. Vuelve al inicio para buscar complejos y
          reservar tu próximo partido.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-[#0F7A4D] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0B6840]"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
