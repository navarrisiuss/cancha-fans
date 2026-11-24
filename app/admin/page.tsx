// Entrada del panel admin. Página de servidor que solo compone las secciones de métricas y la cola
// de revisión, cuyos componentes clientes piden los datos con el token de la sesión.
import { ColaRevision } from "./cola";
import { MetricasAdmin } from "./metricas";

export default function PanelAdmin() {
  return (
    <section className="py-12">
      <h1 className="text-3xl font-semibold tracking-[-0.035em]">Panel de administración</h1>

      <div className="mt-8">
        <MetricasAdmin />
      </div>

      <h2 className="mt-12 text-lg font-semibold">Complejos por aprobar</h2>
      <p className="mt-1 text-sm text-[#627067]">Ordenados por llegada: los más antiguos primero.</p>
      <div className="mt-5">
        <ColaRevision />
      </div>
    </section>
  );
}
