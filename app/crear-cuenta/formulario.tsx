"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase/client";
import { mensajeErrorAuth, type MensajeError } from "../../lib/firebase/errores-auth";

export function FormularioCrearCuenta() {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<MensajeError | null>(null);
  const [nombreCreado, setNombreCreado] = useState<string | null>(null);

  async function crearCuenta(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const nombre = String(datos.get("nombre") ?? "").trim();
    const correo = String(datos.get("correo") ?? "").trim();
    const contrasena = String(datos.get("contrasena") ?? "");

    if (!nombre) {
      setError({ texto: "Escribe tu nombre.", debeActuar: true });
      return;
    }
    if (contrasena !== datos.get("confirmarContrasena")) {
      setError({ texto: "Las contraseñas no coinciden.", debeActuar: true });
      return;
    }

    setError(null);
    setEnviando(true);
    try {
      // Al crear la cuenta, Firebase deja la sesión iniciada en el navegador.
      const credencial = await createUserWithEmailAndPassword(auth, correo, contrasena);
      await updateProfile(credencial.user, { displayName: nombre });
      // Se guarda el correo que devuelve Firebase (normalizado), no el del input: la security
      // rule lo compara contra el token. Si esta escritura falla, la cuenta queda en Auth sin
      // documento en users; el login deberá crearlo si falta.
      await setDoc(doc(db, "users", credencial.user.uid), {
        email: credencial.user.email,
        displayName: nombre,
        phone: null,
        photoURL: null,
        isAdmin: false,
        createdAt: serverTimestamp(),
      });
      setNombreCreado(nombre);
    } catch (errorFirebase) {
      setError(mensajeErrorAuth(errorFirebase));
      setEnviando(false);
    }
  }

  if (nombreCreado) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-lg font-semibold text-[#12241C]">¡Listo, {nombreCreado}!</p>
        <p className="text-sm text-[#4D5D54]">Tu cuenta quedó creada.</p>
        <Link
          href="/"
          className="mt-2 rounded-xl bg-[#0F7A4D] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0B6840]"
        >
          Ir al inicio
        </Link>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={crearCuenta}>
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
      {error && (
        <p
          role="alert"
          className={`text-sm font-semibold ${error.debeActuar ? "text-[#A8302D]" : "text-[#12241C]"}`}
        >
          {error.texto}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="mt-2 rounded-xl bg-[#0F7A4D] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0B6840] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
