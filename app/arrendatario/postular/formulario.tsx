"use client";

// Componente cliente: necesita la sesión de Firebase Auth (useSesion) y, más adelante, estado y
// eventos del formulario. Por ahora solo exige haber iniciado sesión; los campos vienen después.
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent } from "react";
import { normalizarRut } from "../../../lib/rut";
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
      <Campo
        etiqueta="RUT"
        nombre="rut"
        placeholder="12.345.678-5"
        // Marca el campo como inválido mientras el dígito verificador no calce; el navegador lo
        // avisa al enviar el formulario.
        alCambiar={(e) =>
          e.currentTarget.setCustomValidity(normalizarRut(e.currentTarget.value) ? "" : "Ingresa un RUT válido.")
        }
      />
      <Campo etiqueta="Razón social" nombre="razonSocial" placeholder="Nombre legal de la empresa o persona" />
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#12241C]">
        Datos bancarios
        <textarea
          name="datosBancarios"
          required
          rows={3}
          placeholder="Banco, tipo de cuenta, número de cuenta y titular"
          className={clasesInput}
        />
      </label>
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
  alCambiar,
}: {
  etiqueta: string;
  nombre: string;
  placeholder: string;
  autoComplete?: string;
  alCambiar?: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#12241C]">
      {etiqueta}
      <input
        type="text"
        name={nombre}
        required
        autoComplete={autoComplete}
        onChange={alCambiar}
        placeholder={placeholder}
        className={clasesInput}
      />
    </label>
  );
}
