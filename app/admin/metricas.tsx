"use client";

// Componente cliente: consulta /api/admin/metricas con el token de administrador y maneja el estado
// del filtro por mes para actualizar las cifras de reservas pagadas, GMV y comisión.
import { useEffect, useState } from "react";
import { fetchAdmin } from "../../lib/firebase/fetch-admin";
import { PORCENTAJE_COMISION } from "../../lib/reglas";
import type { RespuestaMetricasAdmin } from "../api/admin/metricas/route";

function formatearPesos(monto: number): string {
  return monto.toLocaleString("es-CL", { style: "currency", currency: "CLP" });
}

export function MetricasAdmin() {
  const [mes, setMes] = useState<string>("");
  const [metricas, setMetricas] = useState<RespuestaMetricasAdmin | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const url = mes
      ? `/api/admin/metricas?mes=${encodeURIComponent(mes)}`
      : "/api/admin/metricas";

    fetchAdmin(url)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((datos: RespuestaMetricasAdmin) => {
        if (!cancelado) {
          setMetricas(datos);
          setError(false);
          setCargando(false);
        }
      })
      .catch(() => {
        if (!cancelado) {
          setError(true);
          setCargando(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [mes]);

  function cambiarMes(nuevoMes: string) {
    setCargando(true);
    setMes(nuevoMes);
  }

  return (
    <div className="rounded-[24px] bg-white p-6 shadow-[0_8px_30px_rgba(18,36,28,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#12241C]">Métricas de la plataforma</h2>
          <p className="mt-0.5 text-sm text-[#627067]">
            Calculadas sobre las reservas pagadas con agregaciones en Firestore.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-[#4D5D54]">
            Mes
            <input
              type="month"
              value={mes}
              onChange={(e) => cambiarMes(e.target.value)}
              className="rounded-xl border border-[#DAD7CF] bg-white px-3 py-2 text-sm font-medium text-[#12241C] outline-none focus:border-[#0F7A4D]"
            />
          </label>
          {mes && (
            <button
              type="button"
              onClick={() => cambiarMes("")}
              className="rounded-xl border border-[#DAD7CF] px-3 py-2 text-xs font-semibold text-[#12241C] transition-colors hover:bg-[#F0EEE9]"
            >
              Ver histórico total
            </button>
          )}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-5 text-sm font-semibold text-[#12241C]">
          No pudimos cargar las métricas. Revisa los índices de Firestore o recarga en unos minutos.
        </p>
      ) : cargando || !metricas ? (
        <p className="mt-5 text-sm font-medium text-[#627067]">Calculando métricas…</p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#E7E5DF] bg-[#F0EEE9]/45 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#627067]">
              Reservas pagadas
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#12241C]">
              {metricas.reservasPagadas.toLocaleString("es-CL")}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E7E5DF] bg-[#F0EEE9]/45 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#627067]">
              GMV (ventas brutas)
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#12241C]">
              {formatearPesos(metricas.gmv)}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E7E5DF] bg-[#F0EEE9]/45 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0F7A4D]">
              Comisión plataforma ({PORCENTAJE_COMISION}%)
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#0F7A4D]">
              {formatearPesos(metricas.comision)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
