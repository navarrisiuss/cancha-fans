// Página de servidor: solo fija el título y el marco visual. El listado depende de la sesión de
// Firebase (que vive en el navegador), así que es un componente cliente aparte.
import type { Metadata } from "next";
import Link from "next/link";
import { ListadoMisComplejos } from "./listado";

export const metadata: Metadata = {
  title: "Mis complejos — CanchaFans",
  description: "Revisa el estado de los complejos que postulaste en CanchaFans.",
};

export default function MisComplejos() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-[#F0EEE9] px-5 py-12">
      <div className="w-full max-w-[560px] rounded-[24px] bg-white p-8 shadow-[0_8px_30px_rgba(18,36,28,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#12241C]">Mis complejos</h1>
            <p className="mt-1.5 text-sm text-[#627067]">
              Un administrador revisa cada postulación antes de publicarla.
            </p>
          </div>
          <Link
            href="/arrendatario/postular"
            className="shrink-0 rounded-xl bg-[#0F7A4D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0B6840]"
          >
            Postular otro
          </Link>
        </div>
        <div className="mt-7">
          <ListadoMisComplejos />
        </div>
      </div>
    </div>
  );
}
