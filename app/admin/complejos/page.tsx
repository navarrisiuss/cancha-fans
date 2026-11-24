// Página de servidor: presenta el título y el contenedor del listado completo de complejos para el
// administrador. La paginación y la carga con token viven en el componente cliente.
import { TablaComplejosAdmin } from "./tabla-complejos";

export default function PaginaComplejosAdmin() {
  return (
    <section className="py-12">
      <h1 className="text-3xl font-semibold tracking-[-0.035em]">Complejos registrados</h1>
      <p className="mt-1.5 text-sm text-[#627067]">
        Listado paginado de todos los complejos con su estado actual y su dueño.
      </p>
      <div className="mt-6">
        <TablaComplejosAdmin />
      </div>
    </section>
  );
}
