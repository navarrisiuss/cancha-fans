import type { Metadata } from "next";
import { TarjetaAuth } from "../tarjeta-auth";
import { FormularioIniciarSesion } from "./formulario";

export const metadata: Metadata = {
  title: "Iniciar sesión — CanchaFans",
  description: "Inicia sesión en tu cuenta de CanchaFans para reservar y gestionar tus partidos.",
};

export default function IniciarSesion() {
  return (
    <TarjetaAuth
      titulo="Inicia sesión"
      subtitulo="Entra a tu cuenta para reservar tu cancha."
      pieTexto="¿Todavía no tienes cuenta?"
      pieEnlaceTexto="Crea una"
      pieEnlaceHref="/crear-cuenta"
    >
      <FormularioIniciarSesion />
    </TarjetaAuth>
  );
}
