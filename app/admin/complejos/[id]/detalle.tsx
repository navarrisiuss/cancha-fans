"use client";

// Componente cliente: pide el detalle con el token del admin, maneja la nota y los botones, y abre
// el modal de confirmación. Todo eso necesita estado y eventos, que solo existen en el navegador.
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState, type ReactNode } from "react";
import { fetchAdmin } from "../../../../lib/firebase/fetch-admin";
import type { MensajeError } from "../../../../lib/firebase/errores-auth";
import type { DetalleComplejo } from "../../../api/admin/complejos/[id]/route";
import { formatearFecha } from "../../fechas";

type Decision = "aprobado" | "rechazado";

export function DetalleRevision({ id }: { id: string }) {
  const [complejo, setComplejo] = useState<DetalleComplejo | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  // Decisión esperando confirmación en el modal; null con el modal cerrado.
  const [pendiente, setPendiente] = useState<Decision | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<MensajeError | null>(null);

  useEffect(() => {
    fetchAdmin(`/api/admin/complejos/${encodeURIComponent(id)}`)
      .then(async (r) => {
        if (r.ok) return setComplejo(await r.json());
        setErrorCarga(r.status === 404 ? "Este complejo no existe." : "No pudimos cargar la postulación.");
      })
      .catch(() => setErrorCarga("No pudimos cargar la postulación."));
  }, [id]);

  // Problema del sistema o complejo inexistente: el admin no tiene nada que corregir, va en carbón.
  if (errorCarga) return <p role="alert" className="text-sm font-semibold text-[#12241C]">{errorCarga}</p>;
  if (!complejo) return <p className="text-sm font-medium text-[#627067]">Cargando postulación…</p>;

  function pedirConfirmacion(decision: Decision) {
    if (decision === "rechazado" && !nota.trim()) {
      // El admin debe actuar: va en rojo.
      setError({ texto: "Escribe una nota para rechazar el complejo.", debeActuar: true });
      return;
    }
    setError(null);
    setPendiente(decision);
  }

  async function confirmar() {
    if (!pendiente) return;
    setEnviando(true);
    try {
      const respuesta = await fetchAdmin(`/api/complejos/${encodeURIComponent(id)}/revisar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: pendiente, nota }),
      });
      const cuerpo = await respuesta.json().catch(() => ({}));
      if (respuesta.ok) {
        setComplejo((c) => c && { ...c, estado: pendiente, notaAdmin: nota.trim() });
      } else {
        // 400 trae algo que el admin puede corregir; 409 y el resto son del sistema.
        setError({
          texto: cuerpo.error ?? "No pudimos guardar la revisión. Inténtalo de nuevo.",
          debeActuar: respuesta.status === 400,
        });
      }
    } catch {
      setError({ texto: "No pudimos guardar la revisión. Revisa tu conexión.", debeActuar: false });
    }
    setEnviando(false);
    setPendiente(null);
  }

  const revisado = complejo.estado === "aprobado" || complejo.estado === "rechazado";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-6">
        <Tarjeta>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">{complejo.nombre}</h1>
          <p className="mt-1 text-sm font-medium text-[#627067]">
            {complejo.direccion}, {complejo.comuna}, {complejo.region} · Postulado el {formatearFecha(complejo.createdAt)}
          </p>
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[#4D5D54]">{complejo.descripcion}</p>
        </Tarjeta>

        <Tarjeta titulo={`Fotos (${complejo.fotos.length})`}>
          {complejo.fotos.length === 0 ? (
            <p className="text-sm text-[#627067]">Sin fotos.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {complejo.fotos.map((url, i) => (
                // <img> y no next/image: son pocas fotos en una pantalla interna, y next/image
                // exigiría configurar el dominio de Storage y gastaría optimizaciones de Vercel.
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Foto ${i + 1} de ${complejo.nombre}`} className="aspect-[4/3] w-full rounded-xl object-cover" />
                </a>
              ))}
            </div>
          )}
        </Tarjeta>

        <Tarjeta titulo="Canchas">
          {complejo.canchas.length === 0 ? (
            <p className="text-sm text-[#627067]">Sin canchas todavía. El arrendatario las agrega después de postular.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {complejo.canchas.map((c) => (
                <li key={c.id} className="flex justify-between gap-4">
                  <span className="font-semibold">
                    {c.nombre} · {c.formato}
                    {!c.activa && <span className="ml-2 font-medium text-[#627067]">(inactiva)</span>}
                  </span>
                  <span className="font-medium text-[#4D5D54]">
                    {c.precioPorBloque.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <div className="flex flex-col gap-6">
        <Tarjeta titulo="Datos legales">
          {complejo.legales ? (
            <dl className="flex flex-col gap-3 text-sm">
              <Dato etiqueta="RUT">{complejo.legales.rut}</Dato>
              <Dato etiqueta="Razón social">{complejo.legales.razonSocial}</Dato>
              <Dato etiqueta="Datos bancarios">
                <span className="whitespace-pre-line">{complejo.legales.datosBancarios}</span>
              </Dato>
            </dl>
          ) : (
            <p className="text-sm text-[#627067]">No se encontraron los datos legales.</p>
          )}
        </Tarjeta>

        <Tarjeta titulo="Revisión">
          {revisado ? (
            <div className="text-sm">
              <p className="font-semibold">
                {complejo.estado === "aprobado" ? "Complejo aprobado." : "Complejo rechazado."}
              </p>
              {complejo.notaAdmin && <p className="mt-2 whitespace-pre-line text-[#4D5D54]">{complejo.notaAdmin}</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                Nota interna
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  placeholder="Obligatoria al rechazar. El arrendatario no la ve."
                  className="rounded-xl border border-[#DAD7CF] px-4 py-3 text-sm font-medium outline-none focus:border-[#0F7A4D]"
                />
              </label>
              {error && (
                <p role="alert" className={`text-sm font-semibold ${error.debeActuar ? "text-[#A8302D]" : "text-[#12241C]"}`}>
                  {error.texto}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => pedirConfirmacion("rechazado")}
                  className="rounded-xl border border-[#DAD7CF] py-3 text-sm font-semibold transition-colors hover:bg-[#F0EEE9]"
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  onClick={() => pedirConfirmacion("aprobado")}
                  className="rounded-xl bg-[#0F7A4D] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0B6840]"
                >
                  Aprobar
                </button>
              </div>
            </div>
          )}
        </Tarjeta>
      </div>

      {/* Radix maneja el foco, Escape, el clic afuera y los atributos ARIA del modal. */}
      <Dialog.Root open={pendiente !== null} onOpenChange={(abierto) => !abierto && !enviando && setPendiente(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-[#12241C]/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[24px] bg-white p-7 shadow-[0_24px_70px_rgba(18,36,28,0.18)]">
            <Dialog.Title className="text-lg font-semibold text-[#12241C]">
              {pendiente === "aprobado" ? `¿Aprobar ${complejo.nombre}?` : `¿Rechazar ${complejo.nombre}?`}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-[#4D5D54]">
              {pendiente === "aprobado"
                ? "El complejo aparecerá en las búsquedas y los jugadores podrán reservar."
                : "El complejo no se publicará. Esta decisión no se puede deshacer desde el panel."}
            </Dialog.Description>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Dialog.Close
                disabled={enviando}
                className="rounded-xl border border-[#DAD7CF] py-3 text-sm font-semibold transition-colors hover:bg-[#F0EEE9] disabled:opacity-60"
              >
                Cancelar
              </Dialog.Close>
              <button
                type="button"
                onClick={confirmar}
                disabled={enviando}
                className="rounded-xl bg-[#0F7A4D] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0B6840] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enviando ? "Guardando…" : pendiente === "aprobado" ? "Sí, aprobar" : "Sí, rechazar"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function Tarjeta({ titulo, children }: { titulo?: string; children: ReactNode }) {
  return (
    <section className="rounded-[24px] bg-white p-6 shadow-[0_8px_30px_rgba(18,36,28,0.06)]">
      {titulo && <h2 className="mb-4 text-base font-semibold">{titulo}</h2>}
      {children}
    </section>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#627067]">{etiqueta}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}
