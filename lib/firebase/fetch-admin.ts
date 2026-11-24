// fetch a los endpoints de admin. Es el mismo fetchConSesion (el servidor es quien decide si el
// usuario es admin, con exigirAdmin); se conserva el nombre para no tocar los componentes de /admin.
import "client-only";

export { fetchConSesion as fetchAdmin } from "./fetch-con-sesion";
