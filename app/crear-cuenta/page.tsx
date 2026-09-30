import type { Metadata } from "next";
import { TarjetaAuth } from "../tarjeta-auth";
import { FormularioCrearCuenta } from "./formulario";

export const metadata: Metadata = {
  title: "Crear cuenta — CanchaFans",
  description: "Crea tu cuenta de CanchaFans para buscar, reservar y pagar canchas de fútbol.",
};

export default function CrearCuenta() {
  return (
    <TarjetaAuth
      titulo="Crea tu cuenta"
      subtitulo="Regístrate para reservar y activar el modo arrendatario cuando quieras."
      pieTexto="¿Ya tienes cuenta?"
      pieEnlaceTexto="Inicia sesión"
      pieEnlaceHref="/iniciar-sesion"
    >
      <FormularioCrearCuenta />
    </TarjetaAuth>
  );
}
