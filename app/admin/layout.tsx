// Layout de la zona /admin. Es de servidor porque solo compone: el encabezado no necesita estado
// y el guard (componente cliente) recibe las páginas como children, que siguen siendo de servidor.
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "../componentes-ui";
import { GuardAdmin } from "./guard-admin";

export const metadata: Metadata = {
  title: "Administración — CanchaFans",
  // Zona privada: que los buscadores no la indexen.
  robots: { index: false, follow: false },
};

export default function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F0EEE9] text-[#12241C]">
      <header className="border-b border-[#E7E5DF] bg-white">
        <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
          <Link href="/" aria-label="CanchaFans, inicio">
            <Logo />
          </Link>
          <span className="text-sm font-semibold text-[#627067]">Administración</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-5 lg:px-8">
        <GuardAdmin>{children}</GuardAdmin>
      </main>
    </div>
  );
}
