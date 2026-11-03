"use client";

// Guard de la zona /admin en el navegador. Va en cliente porque necesita la sesión de Firebase
// Auth, que vive en el navegador. Es solo experiencia de usuario: la protección real está en el
// servidor, en exigirAdmin, que valida cada llamada a /api/admin/*.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useSesion } from "../../lib/firebase/use-sesion";

type Resultado = "permitido" | "sin-permiso" | "error";

export function GuardAdmin({ children }: { children: ReactNode }) {
  const router = useRouter();
  const ruta = usePathname();
  const { usuario, cargando } = useSesion();
  // El resultado se guarda junto al uid verificado: si cambia la cuenta, el resultado anterior
  // deja de valer y se vuelve a verificar.
  const [verificacion, setVerificacion] = useState<{ uid: string; resultado: Resultado } | null>(null);

  useEffect(() => {
    if (cargando) return;

    if (!usuario) {
      router.replace(`/iniciar-sesion?siguiente=${encodeURIComponent(ruta)}`);
      return;
    }

    let cancelado = false;
    (async () => {
      let resultado: Resultado;
      try {
        const token = await usuario.getIdToken();
        const respuesta = await fetch("/api/admin/verificar", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        resultado = respuesta.ok ? "permitido" : respuesta.status === 403 ? "sin-permiso" : "error";
      } catch {
        resultado = "error";
      }
      if (!cancelado) setVerificacion({ uid: usuario.uid, resultado });
    })();

    return () => {
      cancelado = true;
    };
  }, [cargando, usuario, router, ruta]);

  const resultado = usuario && verificacion?.uid === usuario.uid ? verificacion.resultado : null;

  if (resultado === "permitido") {
    return <>{children}</>;
  }
  if (resultado === "sin-permiso") {
    return (
      <AvisoEstado
        titulo="No tienes acceso a esta zona"
        texto="Esta sección es solo para administradores de CanchaFans."
      />
    );
  }
  if (resultado === "error") {
    return (
      <AvisoEstado
        titulo="No pudimos verificar tu acceso"
        texto="Revisa tu conexión y recarga la página en unos minutos."
      />
    );
  }
  return <p className="py-24 text-center text-sm font-medium text-[#627067]">Verificando acceso…</p>;
}

// Los avisos van en carbón y no en rojo: el usuario no tiene nada que corregir.
function AvisoEstado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="mx-auto my-24 w-full max-w-[420px] rounded-[24px] bg-white p-8 text-center shadow-[0_8px_30px_rgba(18,36,28,0.06)]">
      <h1 className="text-xl font-semibold tracking-[-0.03em] text-[#12241C]">{titulo}</h1>
      <p className="mt-2 text-sm text-[#627067]">{texto}</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-xl bg-[#0F7A4D] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0B6840]"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
