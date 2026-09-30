import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AppointmentStatus,
  prisma,
  type Disponibilidad,
} from "@agenda/database";
import type { TenantContext } from "@agenda/shared";
import { addMinutes, resolveClinicId } from "../../common/utils/tenant.util";
import { CreateAvailabilityDto } from "./dto/create-availability.dto";
import { QueryAvailabilityDto } from "./dto/query-availability.dto";

export interface Slot {
  medicoId: string;
  medico: string;
  desde: string;
  hasta: string;
  consultorioId: string | null;
}

@Injectable()
export class AvailabilityService {
  async create(
    ctx: TenantContext,
    dto: CreateAvailabilityDto,
  ): Promise<Disponibilidad> {
    const clinicaId = resolveClinicId(ctx);

    if (dto.horaInicio >= dto.horaFin) {
      throw new BadRequestException("horaInicio debe ser anterior a horaFin");
    }

    const medico = await prisma.medico.findFirst({
      where: { id: dto.medicoId, clinicaId },
    });
    if (!medico) {
      throw new NotFoundException("Médico no encontrado en esta clínica");
    }

    const sucursal = await prisma.sucursal.findFirst({
      where: { id: dto.sucursalId, clinicaId },
    });
    if (!sucursal) {
      throw new NotFoundException("Sucursal no encontrada en esta clínica");
    }

    return prisma.disponibilidad.create({
      data: {
        medicoId: dto.medicoId,
        sucursalId: dto.sucursalId,
        consultorioId: dto.consultorioId,
        diaSemana: dto.diaSemana,
        horaInicio: dto.horaInicio,
        horaFin: dto.horaFin,
        vigenteDesde: new Date(dto.vigenteDesde),
        vigenteHasta: dto.vigenteHasta
          ? new Date(dto.vigenteHasta)
          : undefined,
      },
    });
  }

  async listByDoctor(
    ctx: TenantContext,
    medicoId: string,
  ): Promise<Disponibilidad[]> {
    const clinicaId = resolveClinicId(ctx);

    const medico = await prisma.medico.findFirst({
      where: { id: medicoId, clinicaId },
    });
    if (!medico) {
      throw new NotFoundException("Médico no encontrado en esta clínica");
    }

    return prisma.disponibilidad.findMany({
      where: { medicoId, sucursal: { clinicaId } },
      orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
    });
  }

  async getAvailableSlots(
    ctx: TenantContext,
    query: QueryAvailabilityDto,
  ): Promise<Slot[]> {
    const clinicaId = resolveClinicId(ctx, query.clinicaId);
    const fecha = new Date(query.fecha);
    const diaSemana = fecha.getDay();
    const duracion = 30;

    const disponibilidades = await prisma.disponibilidad.findMany({
      where: {
        sucursalId: query.sucursalId,
        diaSemana,
        vigenteDesde: { lte: fecha },
        OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: fecha } }],
        ...(query.medicoId ? { medicoId: query.medicoId } : {}),
      },
      include: { medico: { include: { especialidades: true } } },
    });

    const medicosIds = new Set(
      disponibilidades
        .filter((d) => d.medico.clinicaId === clinicaId)
        .filter(
          (d) =>
            !query.especialidadId ||
            d.medico.especialidades.some(
              (e) => e.id === query.especialidadId,
            ),
        )
        .map((d) => d.medicoId),
    );

    const slots: Slot[] = [];
    for (const d of disponibilidades) {
      if (!medicosIds.has(d.medicoId)) {
        continue;
      }

      let cursor = this.parseTime(fecha, d.horaInicio);
      const fin = this.parseTime(fecha, d.horaFin);

      while (addMinutes(cursor, duracion) <= fin) {
        const hasta = addMinutes(cursor, duracion);
        slots.push({
          medicoId: d.medicoId,
          medico: d.medico.nombre,
          desde: cursor.toISOString(),
          hasta: hasta.toISOString(),
          consultorioId: d.consultorioId,
        });
        cursor = hasta;
      }
    }

    if (slots.length === 0) {
      return [];
    }

    const dayStart = new Date(fecha);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(fecha);
    dayEnd.setHours(23, 59, 59, 999);

    const citas = await prisma.cita.findMany({
      where: {
        clinicaId,
        medicoId: { in: [...medicosIds] },
        estado: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
        fecha: { gte: dayStart, lte: dayEnd },
      },
    });

    const bloqueos = await prisma.bloqueoAgenda.findMany({
      where: {
        medicoId: { in: [...medicosIds] },
        fechaDesde: { lte: dayEnd },
        fechaHasta: { gte: dayStart },
      },
    });

    return slots.filter((slot) => {
      const slotStart = new Date(slot.desde);
      const slotEnd = new Date(slot.hasta);

      const ocupadaPorCita = citas.some((cita) =>
        this.overlaps(
          cita.fecha,
          addMinutes(cita.fecha, cita.duracionMinutos),
          slotStart,
          slotEnd,
        ),
      );

      const bloqueado = bloqueos.some((b) =>
        this.overlaps(b.fechaDesde, b.fechaHasta, slotStart, slotEnd),
      );

      return !ocupadaPorCita && !bloqueado;
    });
  }

  private parseTime(fecha: Date, hhmm: string): Date {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(fecha);
    d.setHours(h, m, 0, 0);
    return d;
  }

  private overlaps(
    aStart: Date,
    aEnd: Date,
    bStart: Date,
    bEnd: Date,
  ): boolean {
    return aStart < bEnd && bStart < aEnd;
  }
}
