import { ForbiddenException } from "@nestjs/common";
import { Roles, type TenantContext } from "@agenda/shared";

export function resolveClinicId(
  ctx: TenantContext,
  requestedId?: string,
): string {
  if (ctx.rol === Roles.SUPER_ADMIN && requestedId) {
    return requestedId;
  }

  if (!ctx.clinicaId) {
    throw new ForbiddenException("Sin contexto de clínica");
  }

  if (requestedId && requestedId !== ctx.clinicaId) {
    throw new ForbiddenException("No puede operar sobre otra clínica");
  }

  return ctx.clinicaId;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}
