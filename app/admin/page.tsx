// Entrada del panel admin. Página de servidor que solo compone: la cola se pide desde un componente
// cliente porque necesita el token de la sesión. Los listados y las métricas van en sus issues.
import { ColaRevision } from "./cola";

export default function PanelAdmin() {
  return (
    <section className="py-16">
      <h1 className="text-3xl font-semibold tracking-[-0.035em]">Panel de administración</h1>
      <h2 className="mt-10 text-lg font-semibold">Complejos por aprobar</h2>
      <p className="mt-1 text-sm text-[#627067]">Ordenados por llegada: los más antiguos primero.</p>
      <div className="mt-5">
        <ColaRevision />
      </div>
    </section>
  );
}
