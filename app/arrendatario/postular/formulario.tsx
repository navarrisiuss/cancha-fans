"use client";

// Componente cliente: necesita la sesión de Firebase Auth (useSesion) y el estado y los eventos
// del formulario. Exige haber iniciado sesión y escribe la postulación directo en Firestore.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { normalizarRut } from "../../../lib/rut";
import { COMUNAS_POR_REGION, REGIONES, type Comuna, type Region } from "../../../lib/comunas";
import { crearComplejo, MAX_BYTES_FOTO, MAX_FOTOS, TIPOS_FOTO } from "../../../lib/firebase/complejos";
import type { MensajeError } from "../../../lib/firebase/errores-auth";
import { useSesion } from "../../../lib/firebase/use-sesion";

export function FormularioPostular() {
  const router = useRouter();
  const { usuario, cargando } = useSesion();
  // La región filtra qué comunas se ofrecen y también se guarda en el complejo.
  const [region, setRegion] = useState<Region | "">("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<MensajeError | null>(null);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    if (!cargando && !usuario) {
      router.replace("/iniciar-sesion?siguiente=/arrendatario/postular");
    }
  }, [cargando, usuario, router]);

  if (!usuario) {
    return <p className="text-sm font-medium text-[#627067]">Verificando tu sesión…</p>;
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!usuario || !region) return;
    const datos = new FormData(evento.currentTarget);
    const texto = (nombre: string) => String(datos.get(nombre) ?? "").trim();

    const comuna = texto("comuna");
    const rut = normalizarRut(texto("rut"));
    if (!rut) {
      setError({ texto: "Ingresa un RUT válido.", debeActuar: true });
      return;
    }
    // Los selects ya lo impiden; esto cubre un formulario manipulado desde la consola.
    if (!(COMUNAS_POR_REGION[region] as readonly string[]).includes(comuna)) {
      setError({ texto: "La comuna no pertenece a la región elegida.", debeActuar: true });
      return;
    }

    setError(null);
    setEnviando(true);
    try {
      await crearComplejo(
        usuario.uid,
        {
          nombre: texto("nombre"),
          descripcion: texto("descripcion"),
          region,
          comuna: comuna as Comuna,
          direccion: texto("direccion"),
        },
        { rut, razonSocial: texto("razonSocial"), datosBancarios: texto("datosBancarios") },
        datos.getAll("fotos").filter((f): f is File => f instanceof File && f.size > 0),
      );
      setEnviado(true);
    } catch {
      // Falla de red o de permisos: no hay nada que el usuario corrija, por eso va en carbón.
      setError({ texto: "No pudimos enviar tu postulación. Inténtalo de nuevo en unos minutos.", debeActuar: false });
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-lg font-semibold text-[#12241C]">¡Postulación enviada!</p>
        <p className="text-sm text-[#4D5D54]">
          Tu complejo quedó en revisión. Te avisaremos cuando un administrador lo apruebe.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-xl bg-[#0F7A4D] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0B6840]"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={enviar}>
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
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#12241C]">
        Fotos del complejo
        <input
          type="file"
          name="fotos"
          multiple
          required
          accept={TIPOS_FOTO.join(",")}
          // Valida con la API nativa (se avisa al enviar): cantidad, tipo y peso. Las security rules
          // vuelven a comprobar el tipo y el peso en Storage.
          onChange={(e) => {
            const fotos = Array.from(e.currentTarget.files ?? []);
            const problema =
              fotos.length > MAX_FOTOS
                ? `Sube como máximo ${MAX_FOTOS} fotos.`
                : fotos.some((f) => !TIPOS_FOTO.includes(f.type))
                  ? "Las fotos deben ser JPG, PNG o WebP."
                  : fotos.some((f) => f.size >= MAX_BYTES_FOTO)
                    ? "Cada foto debe pesar menos de 5 MB."
                    : "";
            e.currentTarget.setCustomValidity(problema);
          }}
          className="rounded-xl border border-[#DAD7CF] px-4 py-3 text-sm font-medium file:mr-3 file:rounded-lg file:border-0 file:bg-[#F0EEE9] file:px-3 file:py-1.5 file:text-sm file:font-semibold"
        />
        <span className="text-xs font-medium text-[#627067]">
          Entre 1 y {MAX_FOTOS} fotos en JPG, PNG o WebP, de menos de 5 MB cada una.
        </span>
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
        {enviando ? "Enviando…" : "Enviar postulación"}
      </button>
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
