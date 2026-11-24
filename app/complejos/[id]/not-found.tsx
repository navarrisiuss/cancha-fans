// Componente de servidor: el mensaje y el enlace se pueden renderizar sin estado ni eventos.
import Link from "next/link";
import { Encabezado } from "../../../components/encabezado";

export default function ComplejoNoEncontrado() {
  return (
    <div className="min-h-screen bg-[#F0EEE9] text-[#12241C]">
      <Encabezado />
      <main className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8">
        <h1 className="text-3xl font-semibold">Complejo no encontrado</h1>
        <p className="mt-2 text-[#4D5D54]">Esta ficha no está disponible.</p>
        <Link href="/buscar" className="mt-5 inline-block text-sm font-semibold text-[#0F7A4D] hover:underline">
          Buscar complejos
        </Link>
      </main>
    </div>
  );
}
