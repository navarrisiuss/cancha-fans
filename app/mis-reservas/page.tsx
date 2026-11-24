import { Encabezado } from "@/components/encabezado";
import { ListadoMisReservas } from "./listado";

// La página va en servidor porque solo compone el encabezado y la estructura.
// El listado usa la sesión y consulta las reservas desde el navegador.
export default function MisReservas() {
  return (
    <>
      <Encabezado />
      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight text-[#12241C] sm:text-4xl">
          Mis reservas
        </h1>
        <ListadoMisReservas />
      </main>
    </>
  );
}
