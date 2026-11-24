import { useState, type FormEvent } from "react";
import { fetchConSesion } from "@/lib/firebase/fetch-con-sesion";
import { claseCampo, leerError, ModalReserva, type ErrorAccion } from "./acciones";

const ESTRELLAS = [1, 2, 3, 4, 5];

// Va en cliente porque la selección de estrellas y el envío del formulario dependen
// de la interacción del jugador y de su sesión de Firebase.
export function DejarResena({ reservaId, alEnviar }: { reservaId: string; alEnviar: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [rating, setRating] = useState(0);
  const [error, setError] = useState<ErrorAccion | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    if (rating === 0) {
      setError({ texto: "Selecciona entre 1 y 5 estrellas.", requiereAccion: true });
      return;
    }

    const campos = new FormData(evento.currentTarget);
    const mensaje = "No pudimos enviar tu reseña. Inténtalo de nuevo.";
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetchConSesion("/api/resenas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(campos), reservaId, rating }),
      });
      if (!respuesta.ok) {
        setError(await leerError(respuesta, mensaje));
        return;
      }
      setAbierto(false);
      alEnviar();
    } catch {
      setError({ texto: mensaje, requiereAccion: false });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ModalReserva
      titulo="Enviar reseña"
      boton="Dejar reseña"
      descripcion="Cuéntanos cómo estuvo tu experiencia en la cancha."
      abierto={abierto}
      enviando={enviando}
      error={error}
      alCambiar={(valor) => { setAbierto(valor); setError(null); setRating(0); }}
      alEnviar={enviar}
    >
      <fieldset disabled={enviando}>
        <legend className="font-semibold">Calificación</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {ESTRELLAS.map((valor) => (
            <label key={valor}>
              <input
                type="radio"
                name="rating"
                value={valor}
                required
                className="peer sr-only"
                checked={rating === valor}
                onChange={() => setRating(valor)}
              />
              <span className="sr-only">{valor === 1 ? "1 estrella" : `${valor} estrellas`}</span>
              <span
                aria-hidden="true"
                className={`grid size-10 cursor-pointer place-items-center rounded-lg border border-[#DAD7CF] text-xl peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#0F7A4D] ${valor <= rating ? "bg-[#0F7A4D] text-white" : "bg-white text-[#12241C]"}`}
              >
                {valor <= rating ? "★" : "☆"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        Comentario (opcional)
        <textarea name="comentario" rows={3} maxLength={1000} className={claseCampo} disabled={enviando} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          Tu equipo (opcional)
          <input name="equipoNombre" maxLength={80} className={claseCampo} disabled={enviando} />
        </label>
        <label>
          Equipo rival (opcional)
          <input name="equipoRivalNombre" maxLength={80} className={claseCampo} disabled={enviando} />
        </label>
      </div>
      <label>
        Resultado (opcional)
        <input name="resultado" maxLength={40} className={claseCampo} disabled={enviando} />
      </label>
    </ModalReserva>
  );
}
