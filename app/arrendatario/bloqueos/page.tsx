// Página de servidor: define los metadatos y la estructura de la pantalla de bloqueos manuales
// del arrendatario. El formulario interactivo y el listado con sesión van en el componente cliente.
import type { Metadata } from "next";
import { GestionBloqueos } from "./gestion-bloqueos";

export const metadata: Metadata = {
  title: "Bloqueos manuales — CanchaFans",
  description: "Bloquea horarios por mantención, eventos privados o lluvia en tus canchas.",
};

export default function PaginaBloqueosArrendatario() {
  return (
    <main className="mx-auto w-full max-w-[1040px] px-5 py-12 lg:px-8">
      <div className="rounded-[24px] bg-white p-8 shadow-[0_8px_30px_rgba(18,36,28,0.06)]">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#12241C]">
          Bloqueos manuales de horario
        </h1>
        <p className="mt-1.5 text-sm text-[#627067]">
          Reserva bloques para mantención, eventos privados o lluvia. Un bloqueo puede cubrir varias
          horas seguidas y no se permite si choca con una reserva activa.
        </p>
        <div className="mt-7">
          <GestionBloqueos />
        </div>
      </div>
    </main>
  );
}
