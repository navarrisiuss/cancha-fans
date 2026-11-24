// Layout de servidor para las páginas estáticas de contenido (/ayuda, /reglas-de-cancelacion,
// /terminos). Compone el encabezado común y el contenedor de lectura con enlaces entre documentos.
import Link from "next/link";
import { Encabezado } from "../../components/encabezado";

const enlacePie = "text-sm font-semibold text-[#0F7A4D] hover:underline";

export default function LayoutContenido({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F0EEE9] text-[#12241C]">
      <Encabezado />
      <main className="mx-auto w-full max-w-[820px] flex-1 px-5 py-12 lg:px-8">
        <article className="rounded-[24px] bg-white p-8 shadow-[0_8px_30px_rgba(18,36,28,0.06)] sm:p-10">
          {children}
        </article>
        <nav
          aria-label="Páginas de soporte"
          className="mt-6 flex flex-wrap items-center justify-center gap-6 text-center"
        >
          <Link href="/ayuda" className={enlacePie}>
            Centro de ayuda
          </Link>
          <Link href="/reglas-de-cancelacion" className={enlacePie}>
            Reglas de cancelación
          </Link>
          <Link href="/terminos" className={enlacePie}>
            Términos y condiciones
          </Link>
        </nav>
      </main>
    </div>
  );
}
