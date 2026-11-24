import type { Metadata } from "next";
import { Checkout } from "./checkout";

export const metadata: Metadata = { title: "Pagar reserva — CanchaFans" };

// La página resuelve los parámetros y define el título en el servidor. El checkout maneja el pago en el navegador.
export default async function PaginaCheckout({ params }: PageProps<"/checkout/[id]">) {
  const { id } = await params;
  return <Checkout id={id} />;
}
