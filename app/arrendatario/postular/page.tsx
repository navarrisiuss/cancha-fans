// Página de servidor: solo fija el título y el marco visual. Todo lo que depende de la sesión de
// Firebase (que vive en el navegador) está en el formulario, que es componente cliente.
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "../../componentes-ui";
import { FormularioPostular } from "./formulario";

export const metadata: Metadata = {
  title: "Publica tu complejo — CanchaFans",
  description: "Postula tu complejo de canchas para recibir reservas en CanchaFans.",
};

export default function PostularComplejo() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-[#F0EEE9] px-5 py-12">
      <Link href="/" aria-label="CanchaFans, inicio" className="mb-8">
        <Logo />
      </Link>
      <div className="w-full max-w-[560px] rounded-[24px] bg-white p-8 shadow-[0_8px_30px_rgba(18,36,28,0.06)]">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#12241C]">
          Publica tu complejo
        </h1>
        <p className="mt-1.5 text-sm text-[#627067]">
          Cuéntanos sobre tu complejo. Un administrador lo revisará antes de publicarlo.
        </p>
        <div className="mt-7">
          <FormularioPostular />
        </div>
      </div>
    </div>
  );
}
