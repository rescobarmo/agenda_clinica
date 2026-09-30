"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import type { PacienteFicha } from "@/lib/types";

function Seccion({ titulo, texto }: { titulo: string; texto: string | null }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {titulo}
      </h2>
      <p className="text-sm text-gray-800">
        {texto && texto.trim() !== "" ? texto : "Sin información"}
      </p>
    </section>
  );
}

export default function FichaPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ pacienteId: string }>();
  const pacienteId = params?.pacienteId;

  const fichaQuery = useQuery({
    queryKey: ["paciente-ficha", pacienteId],
    queryFn: () =>
      apiFetch<PacienteFicha>(
        `/api/pacientes/${pacienteId}/ficha-clinica`,
      ),
    enabled: !!user && !!pacienteId,
  });

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Cargando…</p>
      </main>
    );
  }

  const ficha = fichaQuery.data;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ficha clínica</h1>
          <p className="text-sm text-gray-500">
            Datos del paciente y antecedentes clínicos
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
        >
          ← Volver
        </button>
      </header>

      {fichaQuery.isLoading && (
        <p className="text-sm text-gray-500">Cargando ficha…</p>
      )}

      {fichaQuery.isError && (
        <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          {fichaQuery.error instanceof Error
            ? fichaQuery.error.message
            : "Error al cargar la ficha"}
        </div>
      )}

      {ficha && (
        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Paciente
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-gray-500">Nombre</dt>
              <dd className="font-medium">
                {ficha.nombre} {ficha.apellido}
              </dd>
              <dt className="text-gray-500">RUT</dt>
              <dd className="font-medium">{ficha.rut ?? "—"}</dd>
              <dt className="text-gray-500">Teléfono</dt>
              <dd className="font-medium">{ficha.telefono ?? "—"}</dd>
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium">{ficha.email ?? "—"}</dd>
            </dl>
          </section>

          {ficha.ficha ? (
            <>
              <Seccion
                titulo="Antecedentes"
                texto={ficha.ficha.antecedentes}
              />
              <Seccion titulo="Alergias" texto={ficha.ficha.alergias} />
              <Seccion
                titulo="Medicamentos"
                texto={ficha.ficha.medicamentos}
              />
              <Seccion
                titulo="Notas de evolución"
                texto={ficha.ficha.notasEvolucion}
              />
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Sin ficha clínica registrada para este paciente.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
