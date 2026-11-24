// Página de servidor: lee el parámetro id de la ruta, fija los metadatos y compone el contenedor
// visual. La lectura de Firestore y las acciones de edición van en el componente cliente porque
// dependen de la sesión de Firebase Auth en el navegador.
import type { Metadata } from "next";
import Link from "next/link";
import { GestionCanchasComplejo } from "./canchas";

export const metadata: Metadata = {
  title: "Canchas del complejo — CanchaFans",
  description: "Gestiona las canchas, precios y horarios de atención de tu complejo.",
};

export default async function PaginaCanchasComplejo(
  props: PageProps<"/arrendatario/complejos/[id]">,
) {
  const { id } = await props.params;

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#F0EEE9] px-5 py-12">
      <div className="w-full max-w-[780px] rounded-[24px] bg-white p-8 shadow-[0_8px_30px_rgba(18,36,28,0.06)]">
        <div className="mb-5">
          <Link
            href="/arrendatario/complejos"
            className="text-sm font-semibold text-[#0F7A4D] hover:underline"
          >
            ← Volver a mis complejos
          </Link>
        </div>
        <GestionCanchasComplejo complejoId={id} />
      </div>
    </div>
  );
}
