// Página de servidor: define los metadatos y el marco visual de las reservas recibidas por el
// arrendatario. La consulta autenticada y el modal de cancelación van en el componente cliente.
import type { Metadata } from "next";
import { ListadoReservasRecibidas } from "./listado-reservas";

export const metadata: Metadata = {
  title: "Reservas recibidas — CanchaFans",
  description: "Revisa y gestiona las reservas recibidas en las canchas de tus complejos.",
};

export default function PaginaReservasArrendatario() {
  return (
    <main className="mx-auto w-full max-w-[1040px] px-5 py-12 lg:px-8">
      <div className="rounded-[24px] bg-white p-8 shadow-[0_8px_30px_rgba(18,36,28,0.06)]">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#12241C]">
          Reservas recibidas
        </h1>
        <p className="mt-1.5 text-sm text-[#627067]">
          Reservas de todas tus canchas ordenadas de la más próxima a la más antigua.
        </p>
        <div className="mt-7">
          <ListadoReservasRecibidas />
        </div>
      </div>
    </main>
  );
}
