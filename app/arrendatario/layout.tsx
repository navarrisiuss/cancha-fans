// Layout de servidor para la zona /arrendatario: solo compone el encabezado común y la barra de
// navegación del panel, sin estado ni efectos de cliente.
import Link from "next/link";
import { Encabezado } from "../../components/encabezado";

const enlaceNav =
  "rounded-xl px-3.5 py-2 text-sm font-semibold text-[#12241C] transition-colors hover:bg-[#E7E5DF]/70";

export default function LayoutArrendatario({ children }: LayoutProps<"/arrendatario">) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F0EEE9] text-[#12241C]">
      <Encabezado />
      <div className="border-b border-[#E7E5DF] bg-white/80">
        <nav
          aria-label="Panel del arrendatario"
          className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-2 px-5 py-2.5 lg:px-8"
        >
          <Link href="/arrendatario/resumen" className={enlaceNav}>
            Resumen
          </Link>
          <Link href="/arrendatario/complejos" className={enlaceNav}>
            Mis complejos
          </Link>
          <Link href="/arrendatario/reservas" className={enlaceNav}>
            Reservas recibidas
          </Link>
          <Link href="/arrendatario/bloqueos" className={enlaceNav}>
            Bloqueos manuales
          </Link>
          <Link href="/arrendatario/postular" className={enlaceNav}>
            Postular complejo
          </Link>
        </nav>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
