// Página de servidor: compone el encabezado común, fija los metadatos y estructura la vista del
// historial de notificaciones. La consulta autenticada y el marcado como leída van en el cliente.
import type { Metadata } from "next";
import { Encabezado } from "../../components/encabezado";
import { HistorialNotificaciones } from "./historial";

export const metadata: Metadata = {
  title: "Notificaciones — CanchaFans",
  description: "Revisa el historial de avisos de tus reservas y complejos en CanchaFans.",
};

export default function PaginaNotificaciones() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F0EEE9] text-[#12241C]">
      <Encabezado />
      <main className="mx-auto w-full max-w-[820px] flex-1 px-5 py-12 lg:px-8">
        <div className="rounded-[24px] bg-white p-8 shadow-[0_8px_30px_rgba(18,36,28,0.06)]">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#12241C]">
            Notificaciones
          </h1>
          <p className="mt-1.5 text-sm text-[#627067]">
            Historial de avisos sobre tus reservas y complejos.
          </p>
          <div className="mt-7">
            <HistorialNotificaciones />
          </div>
        </div>
      </main>
    </div>
  );
}
