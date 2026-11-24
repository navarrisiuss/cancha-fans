// Página de servidor: presenta el título y el contenedor del listado de usuarios registrados para
// el administrador. La consulta paginada con token va en el componente cliente.
import { TablaUsuariosAdmin } from "./tabla-usuarios";

export default function PaginaUsuariosAdmin() {
  return (
    <section className="py-12">
      <h1 className="text-3xl font-semibold tracking-[-0.035em]">Usuarios registrados</h1>
      <p className="mt-1.5 text-sm text-[#627067]">
        Listado paginado de cuentas registradas en CanchaFans.
      </p>
      <div className="mt-6">
        <TablaUsuariosAdmin />
      </div>
    </section>
  );
}
