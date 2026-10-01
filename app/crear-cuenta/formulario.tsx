"use client";

import { useState } from "react";

export function FormularioCrearCuenta() {
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(evento) => {
        evento.preventDefault();
        const datos = new FormData(evento.currentTarget);
        if (datos.get("contrasena") !== datos.get("confirmarContrasena")) {
          setError("Las contraseñas no coinciden.");
          setEnviado(false);
          return;
        }
        setError("");
        setEnviado(true);
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#12241C]">
        Nombre completo
        <input
          type="text"
          name="nombre"
          required
          autoComplete="name"
          placeholder="Tu nombre"
          className="rounded-xl border border-[#DAD7CF] px-4 py-3 text-sm font-medium outline-none focus:border-[#0F7A4D]"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#12241C]">
        Correo electrónico
        <input
          type="email"
          name="correo"
          required
          autoComplete="email"
          placeholder="tu@correo.cl"
          className="rounded-xl border border-[#DAD7CF] px-4 py-3 text-sm font-medium outline-none focus:border-[#0F7A4D]"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#12241C]">
        Contraseña
        <input
          type="password"
          name="contrasena"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
          className="rounded-xl border border-[#DAD7CF] px-4 py-3 text-sm font-medium outline-none focus:border-[#0F7A4D]"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#12241C]">
        Confirma tu contraseña
        <input
          type="password"
          name="confirmarContrasena"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="Repite tu contraseña"
          className="rounded-xl border border-[#DAD7CF] px-4 py-3 text-sm font-medium outline-none focus:border-[#0F7A4D]"
        />
      </label>
      {error && <p className="text-sm font-semibold text-[#A8302D]">{error}</p>}
      <button
        type="submit"
        className="mt-2 rounded-xl bg-[#0F7A4D] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0B6840]"
      >
        Crear cuenta
      </button>
      {enviado && (
        <p className="text-center text-sm text-[#4D5D54]">
          El formulario está listo. La conexión con Firebase Auth se agrega en un próximo paso.
        </p>
      )}
    </form>
  );
}
