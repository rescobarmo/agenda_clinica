"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Cita } from "@/lib/types";

const START_HOUR = 8;
const END_HOUR = 20;
const HOUR_HEIGHT = 60;

const ESTADO_COLOR: Record<string, string> = {
  PENDING: "bg-amber-100 border-amber-400 text-amber-900",
  CONFIRMED: "bg-green-100 border-green-400 text-green-900",
  RESCHEDULED: "bg-blue-100 border-blue-400 text-blue-900",
  CANCELLED: "bg-gray-100 border-gray-300 text-gray-500",
  ATTENDED: "bg-teal-100 border-teal-400 text-teal-900",
  NO_SHOW: "bg-red-100 border-red-400 text-red-900",
};

const ESTADO_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  RESCHEDULED: "Reagendada",
  CANCELLED: "Cancelada",
  ATTENDED: "Atendida",
  NO_SHOW: "No asistió",
};

const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i,
);

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function AgendaCalendar() {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const citasQuery = useQuery({
    queryKey: ["citas"],
    queryFn: () => apiFetch<Cita[]>("/api/citas"),
  });

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const byDay = useMemo(() => {
    const map: Record<string, Cita[]> = {};
    for (const cita of citasQuery.data ?? []) {
      const key = new Date(cita.fecha).toDateString();
      (map[key] ??= []).push(cita);
    }
    return map;
  }, [citasQuery.data]);

  const todayKey = new Date().toDateString();

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">Agenda</h2>
          <p className="text-xs text-gray-500">
            {weekStart.toLocaleDateString("es-CL", {
              day: "numeric",
              month: "short",
            })}{" "}
            –{" "}
            {days[6].toLocaleDateString("es-CL", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="rounded-md border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50"
          >
            Hoy
          </button>
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="rounded-md border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50"
          >
            ← Semana
          </button>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="rounded-md border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50"
          >
            Semana →
          </button>
        </div>
      </div>

      {citasQuery.isLoading && (
        <p className="px-4 py-8 text-sm text-gray-500">Cargando agenda…</p>
      )}

      {citasQuery.isError && (
        <p className="px-4 py-8 text-sm text-red-700">
          {citasQuery.error instanceof Error
            ? citasQuery.error.message
            : "Error al cargar la agenda"}
        </p>
      )}

      {citasQuery.data && (
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-gray-200">
              <div />
              {days.map((day) => {
                const isToday = day.toDateString() === todayKey;
                return (
                  <div
                    key={day.toISOString()}
                    className={`border-l border-gray-100 py-2 text-center ${
                      isToday ? "bg-blue-50" : ""
                    }`}
                  >
                    <p className="text-xs font-medium text-gray-500">
                      {day.toLocaleDateString("es-CL", { weekday: "short" })}
                    </p>
                    <p
                      className={`text-sm font-semibold ${
                        isToday ? "text-blue-700" : "text-gray-800"
                      }`}
                    >
                      {day.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-[56px_repeat(7,1fr)]">
              <div>
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{ height: HOUR_HEIGHT }}
                    className="relative border-b border-gray-100"
                  >
                    <span className="absolute -top-2 right-2 text-[10px] text-gray-400">
                      {String(h).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>

              {days.map((day) => {
                const key = day.toDateString();
                const isToday = key === todayKey;
                const dayCitas = byDay[key] ?? [];

                return (
                  <div
                    key={day.toISOString()}
                    className={`relative border-l border-gray-100 ${
                      isToday ? "bg-blue-50/40" : ""
                    }`}
                  >
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        style={{ height: HOUR_HEIGHT }}
                        className="border-b border-gray-100"
                      />
                    ))}

                    {dayCitas.map((cita) => {
                      const d = new Date(cita.fecha);
                      const startMinutes =
                        d.getHours() * 60 +
                        d.getMinutes() -
                        START_HOUR * 60;
                      const top = Math.max((startMinutes / 60) * HOUR_HEIGHT, 0);
                      const height =
                        (cita.duracionMinutos / 60) * HOUR_HEIGHT;
                      const color =
                        ESTADO_COLOR[cita.estado] ?? ESTADO_COLOR.PENDING;

                      return (
                        <div
                          key={cita.id}
                          style={{ top, height }}
                          onClick={() => {
                            if (cita.paciente?.id) {
                              router.push(
                                `/pacientes/${cita.paciente.id}/ficha`,
                              );
                            }
                          }}
                          className={`absolute left-0.5 right-0.5 cursor-pointer overflow-hidden rounded border-l-2 px-1 py-0.5 text-[10px] leading-tight transition hover:opacity-80 ${color}`}
                          title={`${cita.paciente?.nombre ?? ""} · ${
                            cita.medico?.nombre ?? ""
                          }`}
                        >
                          <p className="truncate font-medium">
                            {cita.paciente?.nombre} {cita.paciente?.apellido}
                          </p>
                          <p className="truncate text-[9px] opacity-70">
                            {d.toLocaleTimeString("es-CL", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            · {ESTADO_LABEL[cita.estado] ?? cita.estado}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
