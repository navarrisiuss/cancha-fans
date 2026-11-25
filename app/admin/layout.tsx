// Layout de la zona /admin. Es de servidor porque solo compone el encabezado con la navegación
// interna del panel y envuelve las páginas en el guard de cliente. La campanita es un componente
// cliente (usa la sesión) y se puede montar desde aquí sin convertir el layout en cliente.
import type { Metadata } from "next";
import Link from "next/link";
import { Campanita } from "../../components/notificaciones/campanita";
import { Logo } from "../componentes-ui";
import { GuardAdmin } from "./guard-admin";

export const metadata: Metadata = {
  title: "Administración — CanchaFans",
  // Zona privada: que los buscadores no la indexen.
  robots: { index: false, follow: false },
};

const enlaceNav =
  "rounded-xl px-3.5 py-2 text-sm font-semibold text-[#12241C] transition-colors hover:bg-[#F0EEE9]";

export default function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F0EEE9] text-[#12241C]">
      <header className="border-b border-[#E7E5DF] bg-white">
        <div className="mx-auto flex min-h-[68px] max-w-[1240px] flex-wrap items-center justify-between gap-4 px-5 py-2 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="CanchaFans, inicio">
              <Logo />
            </Link>
            <span className="text-sm font-semibold text-[#627067]">Administración</span>
          </div>

          <nav aria-label="Navegación de administración" className="flex flex-wrap items-center gap-1.5">
            <Link href="/admin" className={enlaceNav}>
              Cola y métricas
            </Link>
            <Link href="/admin/complejos" className={enlaceNav}>
              Complejos
            </Link>
            <Link href="/admin/usuarios" className={enlaceNav}>
              Usuarios
            </Link>
            <Campanita />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-5 lg:px-8">
        <GuardAdmin>{children}</GuardAdmin>
      </main>
    </div>
  );
}
