import { Encabezado } from "../../../../components/encabezado";
import { Comprobante } from "./comprobante";

// La página resuelve los parámetros en el servidor y deja la lectura autenticada al componente cliente.
export default async function PaginaComprobante({ params, searchParams }: PageProps<"/reservas/[id]/comprobante">) {
  const [{ id }, consulta] = await Promise.all([params, searchParams]);

  return (
    <>
      <Encabezado />
      <main className="mx-auto max-w-2xl px-5 py-10 text-[#12241C]">
        <Comprobante id={id} reintentarRetorno={consulta.retorno === "pendiente"} />
      </main>
    </>
  );
}
