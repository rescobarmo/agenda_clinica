import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const createAppointmentSchema = z.object({
  clinicaId: z.string().uuid(),
  sucursalId: z.string().uuid(),
  consultorioId: z.string().uuid().optional(),
  especialidadId: z.string().uuid(),
  medicoId: z.string().uuid(),
  pacienteId: z.string().uuid(),
  fecha: z.string().datetime(),
  duracionMinutos: z.number().int().positive().optional(),
});

export const rescheduleAppointmentSchema = z.object({
  fecha: z.string().datetime(),
  consultorioId: z.string().uuid().optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const availabilityQuerySchema = z.object({
  clinicaId: z.string().uuid(),
  sucursalId: z.string().uuid(),
  especialidadId: z.string().uuid().optional(),
  medicoId: z.string().uuid().optional(),
  fecha: z.string().date(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
