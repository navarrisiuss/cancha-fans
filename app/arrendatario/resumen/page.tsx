// Página de servidor: solo define los metadatos y compone el contenedor estático del resumen.
// La sesión de Firebase Auth y el filtro mensual interactivo viven en el componente cliente.
import type { Metadata } from "next";
import { ResumenArrendatario } from "./resumen-arrendatario";

export const metadata: Metadata = {
  title: "Resumen — CanchaFans",
  description: "Revisa las métricas mensuales y las reservas de hoy de tus complejos.",
};

export default function PaginaResumenArrendatario() {
  return (
    <main className="mx-auto w-full max-w-[1040px] px-5 py-12 lg:px-8">
      <div className="rounded-[24px] bg-white p-8 shadow-[0_8px_30px_rgba(18,36,28,0.06)]">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#12241C]">Resumen</h1>
        <p className="mt-1.5 text-sm text-[#627067]">
          Métricas mensuales de tus canchas y reservas programadas para hoy.
        </p>
        <div className="mt-6">
          <ResumenArrendatario />
        </div>
      </div>
    </main>
  );
}
