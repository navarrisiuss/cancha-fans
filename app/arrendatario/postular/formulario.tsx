"use client";

// Componente cliente: necesita la sesión de Firebase Auth (useSesion) y, más adelante, estado y
// eventos del formulario. Por ahora solo exige haber iniciado sesión; los campos vienen después.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { COMUNAS_POR_REGION, REGIONES, type Region } from "../../../lib/comunas";
import { useSesion } from "../../../lib/firebase/use-sesion";

export function FormularioPostular() {
  const router = useRouter();
  const { usuario, cargando } = useSesion();
  // La región filtra qué comunas se ofrecen y también se guarda en el complejo.
  const [region, setRegion] = useState<Region | "">("");

  useEffect(() => {
    if (!cargando && !usuario) {
      router.replace("/iniciar-sesion?siguiente=/arrendatario/postular");
    }
  }, [cargando, usuario, router]);

  if (!usuario) {
    return <p className="text-sm font-medium text-[#627067]">Verificando tu sesión…</p>;
  }

  return (
    <form className="flex flex-col gap-4">
      <Campo etiqueta="Nombre del complejo" nombre="nombre" placeholder="Ej. Los Leones" />
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#12241C]">
        Descripción
        <textarea
          name="descripcion"
          required
          rows={4}
          placeholder="Cuéntales a los jugadores qué ofrece tu complejo"
          className={clasesInput}
        />
      </label>
      <Selector etiqueta="Región" nombre="region" valor={region} alElegir={(v) => setRegion(v as Region | "")}>
        <option value="">Elige una región</option>
        {REGIONES.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </Selector>
      {/* key = región: al cambiarla, el select de comuna se reinicia y no queda una comuna ajena. */}
      <Selector key={region} etiqueta="Comuna" nombre="comuna" deshabilitado={!region}>
        <option value="">{region ? "Elige una comuna" : "Primero elige una región"}</option>
        {region && COMUNAS_POR_REGION[region].map((c) => <option key={c}>{c}</option>)}
      </Selector>
      <Campo etiqueta="Dirección" nombre="direccion" placeholder="Calle y número" autoComplete="street-address" />
    </form>
  );
}

const clasesInput =
  "rounded-xl border border-[#DAD7CF] px-4 py-3 text-sm font-medium outline-none focus:border-[#0F7A4D]";

function Selector({
  etiqueta,
  nombre,
  valor,
  alElegir,
  deshabilitado,
  children,
}: {
  etiqueta: string;
  nombre: string;
  valor?: string;
  alElegir?: (valor: string) => void;
  deshabilitado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#12241C]">
      {etiqueta}
      <select
        name={nombre}
        required
        disabled={deshabilitado}
        {...(alElegir ? { value: valor, onChange: (e) => alElegir(e.target.value) } : {})}
        className={clasesInput}
      >
        {children}
      </select>
    </label>
  );
}

function Campo({
  etiqueta,
  nombre,
  placeholder,
  autoComplete,
}: {
  etiqueta: string;
  nombre: string;
  placeholder: string;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#12241C]">
      {etiqueta}
      <input
        type="text"
        name={nombre}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={clasesInput}
      />
    </label>
  );
}
