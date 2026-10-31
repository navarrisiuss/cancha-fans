// GET /api/admin/verificar: responde 200 solo si quien llama es admin. Lo usa el guard de la zona
// /admin para decidir si muestra el panel. Al leer la cabecera Authorization, Next.js lo ejecuta
// en cada petición (Vercel Function) y no lo pre-genera en el build.
import { exigirAdmin } from "../../../../lib/firebase/exigir-admin";

export async function GET(request: Request) {
  const resultado = await exigirAdmin(request);
  if (resultado instanceof Response) {
    return resultado;
  }

  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
