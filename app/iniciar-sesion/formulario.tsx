"use client";

// Componente cliente: usa estado, eventos del formulario y Firebase Auth, que guarda la sesión en
// el navegador. La página que lo contiene sigue siendo de servidor y se genera estática.
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase/client";
import { mensajeErrorAuth, type MensajeError } from "../../lib/firebase/errores-auth";
import { asegurarDocumentoUsuario } from "../../lib/firebase/usuarios";

// Destino después de iniciar sesión. Lo pone el guard de una zona protegida, por ejemplo
// /iniciar-sesion?siguiente=/admin. Solo se aceptan rutas internas: "//otro-sitio.com" o
// "https://..." permitirían usar el login para redirigir a una página falsa.
function rutaSiguiente(): string {
  const siguiente = new URLSearchParams(window.location.search).get("siguiente");
  if (siguiente && siguiente.startsWith("/") && !siguiente.startsWith("//")) {
    return siguiente;
  }
  return "/";
}

export function FormularioIniciarSesion() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<MensajeError | null>(null);

  async function iniciarSesion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const correo = String(datos.get("correo") ?? "").trim();
    const contrasena = String(datos.get("contrasena") ?? "");

    setError(null);
    setEnviando(true);
    try {
      const credencial = await signInWithEmailAndPassword(auth, correo, contrasena);
      await asegurarDocumentoUsuario(credencial.user);
      // replace y no push: al volver atrás no tiene sentido regresar al formulario de login.
      router.replace(rutaSiguiente());
    } catch (errorFirebase) {
      setError(mensajeErrorAuth(errorFirebase));
      setEnviando(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={iniciarSesion}>
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
          autoComplete="current-password"
          placeholder="••••••••"
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
        {enviando ? "Ingresando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
