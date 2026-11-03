// Entrada del panel admin. Página de servidor sin datos: la cola de complejos por aprobar, los
// listados y las métricas se agregan en sus propias issues.
export default function PanelAdmin() {
  return (
    <section className="py-16">
      <h1 className="text-3xl font-semibold tracking-[-0.035em]">Panel de administración</h1>
      <p className="mt-2 text-[#627067]">
        Desde acá vas a revisar los complejos por aprobar, los usuarios y las métricas de reservas.
      </p>
    </section>
  );
}
