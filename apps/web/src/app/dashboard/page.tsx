"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import type { Cita } from "@/lib/types";

const ESTADO_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  RESCHEDULED: "Reagendada",
  CANCELLED: "Cancelada",
  ATTENDED: "Atendida",
  NO_SHOW: "No asistió",
};

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const citasQuery = useQuery({
    queryKey: ["citas"],
    queryFn: () => apiFetch<Cita[]>("/api/citas"),
    enabled: !!user,
  });

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Cargando…</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel</h1>
          <p className="text-sm text-gray-500">
            Sesión iniciada como{" "}
            <span className="font-medium text-gray-700">{user.rol}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/agenda"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Ver agenda
          </Link>
          <button
            onClick={async () => {
              await logout();
              router.replace("/login");
            }}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Citas</h2>
          <button
            onClick={() => citasQuery.refetch()}
            disabled={citasQuery.isFetching}
            className="rounded-md border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
          >
            {citasQuery.isFetching ? "Actualizando…" : "Actualizar"}
          </button>
        </div>

        {citasQuery.isLoading && (
          <p className="text-sm text-gray-500">Cargando citas…</p>
        )}

        {citasQuery.isError && (
          <div className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
            {citasQuery.error instanceof Error
              ? citasQuery.error.message
              : "Error al cargar citas"}
          </div>
        )}

        {citasQuery.data && citasQuery.data.length === 0 && (
          <p className="text-sm text-gray-500">No hay citas registradas.</p>
        )}

        {citasQuery.data && citasQuery.data.length > 0 && (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {citasQuery.data.map((cita) => (
              <li
                key={cita.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {cita.paciente?.nombre} {cita.paciente?.apellido}
                  </p>
                  <p className="text-xs text-gray-500">
                    {cita.medico?.nombre ?? "Sin médico"} ·{" "}
                    {cita.sucursal?.nombre ?? "Sin sucursal"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    {new Date(cita.fecha).toLocaleString("es-CL")}
                  </p>
                  <span className="text-xs font-medium text-gray-500">
                    {ESTADO_LABEL[cita.estado] ?? cita.estado}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-center text-xs text-gray-400">
        <Link href="/" className="text-blue-600">Inicio</Link>
      </p>
    </main>
  );
}
