"use client";

// Componente cliente: necesita la sesión de Firebase Auth (useSesion) y, más adelante, estado y
// eventos del formulario. Por ahora solo exige haber iniciado sesión; los campos vienen después.
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSesion } from "../../../lib/firebase/use-sesion";

export function FormularioPostular() {
  const router = useRouter();
  const { usuario, cargando } = useSesion();

  useEffect(() => {
    if (!cargando && !usuario) {
      router.replace("/iniciar-sesion?siguiente=/arrendatario/postular");
    }
  }, [cargando, usuario, router]);

  if (!usuario) {
    return <p className="text-sm font-medium text-[#627067]">Verificando tu sesión…</p>;
  }

  return <form className="flex flex-col gap-4">{/* Campos en los próximos commits */}</form>;
}
