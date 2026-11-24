// Página de servidor: solo lee el id de la URL y se lo pasa al detalle. El id no es un dato
// sensible; los datos del complejo los pide el componente cliente con el token del admin, porque
// esta página se renderiza antes de que el guard confirme quién la está viendo.
import Link from "next/link";
import { DetalleRevision } from "./detalle";

export default async function RevisarComplejo(props: PageProps<"/admin/complejos/[id]">) {
  // En Next.js 16 params es una promesa.
  const { id } = await props.params;
  return (
    <section className="py-12">
      <Link href="/admin" className="text-sm font-semibold text-[#0F7A4D] hover:underline">
        ← Volver a la cola
      </Link>
      <div className="mt-6">
        <DetalleRevision id={id} />
      </div>
    </section>
  );
}
